import React, { useState, useEffect, useCallback,useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import QrReader from 'react-qr-scanner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { QrCode, Users, BookOpen, TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw, LogOut, Edit2, Save, X, Copy, ExternalLink, Wallet, Camera,ZoomIn, ZoomOut, Maximize, RotateCw, Focus  } from 'lucide-react';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast'; // Assuming this is the correct hook path

// QR Scanner Component with Camera and Manual Input
const QRScanner = ({ onScan, onClose }) => {
  const [manualInput, setManualInput] = useState("");
  const [scanMode, setScanMode] = useState("camera");
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const foundRef = useRef(false);

  useEffect(() => {
    if (scanMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    
  }, [scanMode]);

  // load jsQR if missing
  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const startCamera = async () => {
    // If a stream already exists, don't start another one
    if (streamRef.current) {
      return;
    }

    foundRef.current = false;
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        // attach stream
        videoRef.current.srcObject = stream;

        // remove any previous handler to avoid duplicates
        videoRef.current.onloadedmetadata = null;

        // set a handler to start scanning once metadata loaded
        videoRef.current.onloadedmetadata = async () => {
          // remove handler immediately to avoid duplicate invocations
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = null;
          }

          // start playback if not already playing
          try {
            // only call play when paused to avoid redundant play() calls
            if (videoRef.current.paused) {
              // await play() so we can catch interruption errors
              await videoRef.current.play();
            }
          } catch (err) {
            // Ignore the specific known benign error that occurs when play() is interrupted
            // Different browsers produce different error shapes; check message and name
            const msg = err && (err.message || err.toString());
            if (msg && msg.includes("interrupted")) {
              // benign race: ignore
              console.debug("play() interrupted by new load request — ignored.");
            } else {
              console.warn("video.play() failed:", err);
            }
          }

          // start scanning loop
          startScanning();
        };

        // Try to call play immediately if metadata already loaded
        try {
          if (videoRef.current.readyState >= 1 && videoRef.current.paused) {
            await videoRef.current.play();
            // start scanning (if metadata already present)
            startScanning();
          }
        } catch (err) {
          // same handling as above
          const msg = err && (err.message || err.toString());
          if (msg && msg.includes("interrupted")) {
            console.debug("initial play() interrupted — ignored.");
          } else {
            // Not fatal; scanning will start when onloadedmetadata fires
            console.warn("initial video.play() failed:", err);
          }
        }
      } else {
        // In case videoRef not mounted yet, still start scanning after a small delay
        setTimeout(() => {
          startScanning();
        }, 300);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(err?.message || "Camera access denied");
      // Ensure we didn't leave a partial stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (_) {}
        streamRef.current = null;
      }
    }
  };

  const stopCamera = () => {
    // clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // stop tracks if any
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {}
        });
      } catch (e) {
        console.warn("Error stopping tracks", e);
      }
      streamRef.current = null;
    }

    // detach video element safely
    if (videoRef.current) {
      try {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {}
    }

    setScanning(false);
    // allow scanning again in future
    foundRef.current = false;
  };

  const startScanning = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // clear any existing interval to avoid duplicates
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    scanIntervalRef.current = setInterval(() => {
      try {
        if (foundRef.current) return;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        // match canvas size to video frame
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // draw scaled image so jsQR gets correct dimensions
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (window.jsQR) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            handleQRDetected(code.data);
          }
        }
      } catch (err) {
        console.error("QR scanning error:", err);
      }
    }, 150);

    // we don't set scanning=true here; scanning becomes true only when a code is detected
  };

  const handleQRDetected = (data) => {
    if (!data) return;
    if (foundRef.current) return; // extra guard

    foundRef.current = true;
    setScanning(true);

    // call user handler
    try {
      onScan(data);
    } catch (e) {
      console.error("onScan handler threw:", e);
    }

    // visual feedback
    if (videoRef.current) {
      const el = videoRef.current;
      el.style.transition = "filter 160ms";
      el.style.filter = "brightness(1.5)";
      setTimeout(() => {
        try {
          el.style.filter = "brightness(1)";
        } catch (_) {}
      }, 180);
    }

    // stop camera shortly after so UI can show detection
    setTimeout(() => {
      stopCamera();
      setScanning(false);
      if (onClose) {
        try {
          onClose();
        } catch (e) {
          console.warn("onClose error:", e);
        }
      }
    }, 350);
  };

  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      if (foundRef.current) return;
      foundRef.current = true;
      try {
        onScan(manualInput.trim());
      } catch (e) {
        console.error(e);
      }
      setManualInput("");
      stopCamera();
      if (onClose) onClose();
    } else {
      if (typeof toast !== "undefined") toast.error("Please enter QR code content");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setScanMode("camera")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            scanMode === "camera" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Camera className="inline-block h-4 w-4 mr-2" />
          Camera
        </button>
        <button
          onClick={() => {
            setScanMode("manual");
            stopCamera();
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            scanMode === "manual" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Manual Input
        </button>
      </div>

      {scanMode === "camera" ? (
        <div className="space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ height: "400px" }}>
            {cameraError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white p-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <p className="text-sm mb-2">Camera Error</p>
                  <p className="text-xs opacity-75">{cameraError}</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative" style={{ width: "280px", height: "280px" }}>
                    <div className={`absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 rounded-tl-lg transition-all duration-300 ${scanning ? "border-green-400 shadow-lg shadow-green-400/50" : "border-white/80"}`} />
                    <div className={`absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 rounded-tr-lg transition-all duration-300 ${scanning ? "border-green-400 shadow-lg shadow-green-400/50" : "border-white/80"}`} />
                    <div className={`absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 rounded-bl-lg transition-all duration-300 ${scanning ? "border-green-400 shadow-lg shadow-green-400/50" : "border-white/80"}`} />
                    <div className={`absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 rounded-br-lg transition-all duration-300 ${scanning ? "border-green-400 shadow-lg shadow-green-400/50" : "border-white/80"}`} />
                    {!scanning && (
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent scan-line" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white py-4 px-4">
                  {scanning ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400 animate-pulse" />
                      <span className="font-medium">QR Code Detected!</span>
                    </div>
                  ) : (
                    <div className="text-center text-sm">
                      <p className="font-medium mb-1">Position QR code in frame</p>
                      <p className="text-xs opacity-75">Hold steady • Distance: 20-50cm</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {!cameraError && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <button onClick={() => handleZoomChange(Math.max(1, zoomLevel - 0.5))} disabled={zoomLevel <= 1} className="p-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">
                <ZoomOut className="h-5 w-5" />
              </button>

              <div className="flex-1 text-center">
                <span className="text-sm font-semibold text-gray-700">{zoomLevel.toFixed(1)}x</span>
              </div>

              <button onClick={() => handleZoomChange(Math.min(3, zoomLevel + 0.5))} disabled={zoomLevel >= 3} className="p-2 rounded-lg bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-2">Scanning Tips:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Hold device steady and parallel to QR code</li>
              <li>Ensure good lighting without glare</li>
              <li>Keep QR code within the frame brackets</li>
            </ul>
          </div>

          <style>{`
            @keyframes scan {
              0% { top: 0; }
              50% { top: 100%; }
              100% { top: 0; }
            }
            .scan-line {
              animation: scan 2s ease-in-out infinite;
            }
          `}</style>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2">Paste QR Code Content</Label>
            <Textarea className="w-full font-mono text-sm" rows={4} placeholder="Example: class-id-123|qr-id-456|1234567890" value={manualInput} onChange={(e) => setManualInput(e.target.value)} />
          </div>
          <Button onClick={handleManualSubmit} className="w-full" disabled={!manualInput.trim()}>
            <QrCode className="mr-2 h-4 w-4" />
            Submit QR Content
          </Button>
        </div>
      )}

      <Button variant="outline" onClick={() => { stopCamera(); if (onClose) onClose(); }} className="w-full">
        Cancel
      </Button>
    </div>
  );
}; 


// Attendance Graphs with Real Data Visualization
const AttendanceGraphs = ({ attendance }) => {
  if (!attendance || attendance.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>No attendance data available yet</p>
        <p className="text-sm mt-2">Start marking attendance to see insights</p>
      </div>
    );
  }

  // Process data for graphs
  const classCounts = attendance.reduce((acc, record) => {
    const className = record.class_name || 'Unknown';
    acc[className] = (acc[className] || 0) + 1;
    return acc;
  }, {});

  const monthCounts = attendance.reduce((acc, record) => {
    const date = new Date(record.timestamp);
    const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const maxCount = Math.max(...Object.values(classCounts), 1);
  const maxMonthCount = Math.max(...Object.values(monthCounts), 1);

  return (
    <div className="space-y-6">
      {/* Class-wise Attendance Bar Chart */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Attendance by Class</h3>
        <div className="space-y-3">
          {Object.entries(classCounts).map(([className, count]) => (
            <div key={className}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium truncate">{className}</span>
                <span className="text-gray-600">{count} {count === 1 ? 'session' : 'sessions'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${(count / maxCount) * 100}%`, minWidth: '30px' }}
                >
                  <span className="text-xs text-white font-semibold">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Attendance Chart */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Monthly Attendance</h3>
        <div className="flex items-end justify-between gap-2 h-32 border-b border-l border-gray-300 pl-2 pb-2">
          {Object.entries(monthCounts).map(([month, count]) => (
            <div key={month} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end flex-1">
                <span className="text-xs font-semibold mb-1">{count}</span>
                <div
                  className="w-full bg-green-500 rounded-t transition-all"
                  style={{ height: `${(count / maxMonthCount) * 100}%`, minHeight: '24px' }}
                />
              </div>
              <span className="text-xs mt-2 text-gray-600 truncate max-w-full">{month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{attendance.length}</div>
          <div className="text-xs text-gray-600">Total Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{Object.keys(classCounts).length}</div>
          <div className="text-xs text-gray-600">Classes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {attendance.length > 0 ? '100' : '0'}%
          </div>
          <div className="text-xs text-gray-600">Verified</div>
        </div>
      </div>
    </div>
  );
};

// Attendance Card Component
const AttendanceCard = ({ record }) => {
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{record.class_name || 'Unknown Class'}</h3>
              {record.verified && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(record.timestamp).toLocaleString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Details'}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {record.blockchain_hash && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Blockchain Hash:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {record.blockchain_hash.substring(0, 16)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(record.blockchain_hash, 'Blockchain hash')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {record.blockchain_tx && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Transaction:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {record.blockchain_tx.substring(0, 16)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(record.blockchain_tx, 'Transaction hash')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {record.ipfs_cid && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">IPFS CID:</span>
                <div className="flex items-center gap-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {record.ipfs_cid.substring(0, 16)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(record.ipfs_cid, 'IPFS CID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Student Profile Component (Complete Version with Wallet and Contacts)
const StudentProfile = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metamaskConnected, setMetamaskConnected] = useState(false);
  const [metamaskAddress, setMetamaskAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [networkName, setNetworkName] = useState('');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    student_id: user?.student_id || user?.id || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    department: user?.department || '',
    year: user?.year || '',
    rollNo: user?.rollNo || ''
  });

  const [stats, setStats] = useState({
    totalAttendance: 0,
    classesEnrolled: 0,
    attendancePercentage: 0,
    recentActivity: []
  });

  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', address: '' });

  useEffect(() => {
    checkMetaMaskConnection();
    fetchProfileStats();
    loadContacts();
  }, []);

  const checkMetaMaskConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setMetamaskAddress(accounts[0]);
          setMetamaskConnected(true);
          await fetchWalletBalance(accounts[0]);
          await getNetworkName();
        }
      } catch (error) {
        console.error('MetaMask check error:', error);
      }
    }
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed. Please install MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        const address = accounts[0];
        setMetamaskAddress(address);
        setMetamaskConnected(true);
        
        await updateMetaMaskAddress(address);
        await fetchWalletBalance(address);
        await getNetworkName();
        
        toast.success('MetaMask connected successfully!');
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      toast.error(error.message || 'Failed to connect MetaMask');
    } finally {
      setLoading(false);
    }
  };

  const disconnectMetaMask = () => {
    setMetamaskConnected(false);
    setMetamaskAddress('');
    setWalletBalance('0');
    toast.success('MetaMask disconnected');
  };

  const fetchWalletBalance = async (address) => {
    setWalletBalance('0.0000');
    setNetworkName('Ethereum Network');
  };

  const getNetworkName = async () => {
    setNetworkName('Ethereum Network');
  };

  const updateMetaMaskAddress = async (address) => {
    try {
      await axios.post(`${API}/user/update-wallet`, { walletAddress: address });
    } catch (error) {
      console.error('Wallet update error:', error);
      toast.error('Failed to save wallet address to profile');
    }
  };

  const fetchProfileStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/student-stats`);
      const data = response.data;
      setStats({
        totalAttendance: data.total_attendance || 0,
        classesEnrolled: data.enrolled_classes || 0,
        attendancePercentage: data.attendance_percentage || 0,
        recentActivity: data.recent_attendance || []
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/user/profile`, formData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
      if (onUpdate) onUpdate(formData);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const loadContacts = () => {
    const saved = localStorage.getItem('student_contacts');
    if (saved) {
      setContacts(JSON.parse(saved));
    }
  };

  const saveContacts = (newContacts) => {
    localStorage.setItem('student_contacts', JSON.stringify(newContacts));
    setContacts(newContacts);
  };

  const addContact = () => {
    if (!newContact.name || !newContact.address) {
      toast.error('Please fill in all contact fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(newContact.address)) {
      toast.error('Invalid Ethereum address format');
      return;
    }

    const updated = [...contacts, { ...newContact, id: Date.now() }];
    saveContacts(updated);
    setNewContact({ name: '', address: '' });
    setShowAddContact(false);
    toast.success('Contact added successfully!');
  };

  const removeContact = (id) => {
    const updated = contacts.filter(c => c.id !== id);
    saveContacts(updated);
    toast.success('Contact removed');
  };

  const exportData = () => {
    const data = {
      profile: formData,
      stats,
      metamaskAddress,
      contacts,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_profile_${formData.student_id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Profile data exported!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
          <p className="text-gray-600 mt-1">Manage your account and blockchain identity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData} size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendance}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Enrolled</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classesEnrolled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendancePercentage}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{walletBalance} ETH</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Details about your student profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={formData.email} disabled />
              </div>
              <div>
                <Label>Student ID</Label>
                <Input value={formData.student_id} disabled />
              </div>
              <div>
                <Label>Roll Number</Label>
                <Input value={formData.rollNo} disabled/>
              </div>
              <div>
                <Label>Phone</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input 
                  value={formData.department} 
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div>
                <Label>Year of Study</Label>
                <Input 
                  value={formData.year} 
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
            </div>
            <div>
              <Label>Bio / About Me</Label>
              <Textarea 
                value={formData.bio} 
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                disabled={!isEditing} 
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blockchain Wallet</CardTitle>
            <CardDescription>Connect your MetaMask wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metamaskConnected ? (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Wallet connected on {networkName}
                  </AlertDescription>
                </Alert>
                <div>
                  <Label>Wallet Address</Label>
                  <div className="flex items-center gap-2">
                    <Input value={metamaskAddress} readOnly className="font-mono text-xs" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => copyToClipboard(metamaskAddress, 'Address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Balance</Label>
                  <Input value={`${walletBalance} ETH`} readOnly />
                </div>
                <Button variant="destructive" onClick={disconnectMetaMask} className="w-full">
                  Disconnect Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Wallet not connected. Connect to enable blockchain features.
                  </AlertDescription>
                </Alert>
                <Button onClick={connectMetaMask} disabled={loading} className="w-full">
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect MetaMask
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Activity</CardTitle>
          <CardDescription>Your last 5 attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity found</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{activity.class_name || 'Class'}</p>
                      <p className="text-sm text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant="default">Present</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Contacts (Local)</CardTitle>
          <CardDescription>Manage frequently used wallet addresses (stored locally)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No contacts saved</p>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{contact.address}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeContact(contact.id)}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">Add New Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Wallet Contact</DialogTitle>
                <DialogDescription>Save a wallet address for quick access</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input 
                  placeholder="Contact Name" 
                  value={newContact.name} 
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} 
                />
                <Input 
                  placeholder="Wallet Address (0x...)" 
                  value={newContact.address} 
                  onChange={(e) => setNewContact({ ...newContact, address: e.target.value })} 
                />
                <Button onClick={addContact} className="w-full">Save Contact</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

// Main StudentDashboard Component
const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [stats, setStats] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ show: false, title: '', message: '', type: 'error' });

  // Function to get current geolocation
  const getGeolocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(new Error(`Geolocation error: ${error.message}`));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    });
  };
 

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, attendanceResponse] = await Promise.all([
        axios.get(`${API}/dashboard/student-stats`),
        axios.get(`${API}/attendance/history`)
      ]);
      
      setStats(statsResponse.data);
      setAttendance(attendanceResponse.data);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAttendance = async (qrContent) => {
    if (!qrContent || !qrContent.trim()) {
      toast.error('Invalid QR code content');
      return;
    }

    try {
      // Parse QR content to extract qr_id for duplicate check
      const parts = qrContent.split('|');
      if (parts.length !== 3) {
        toast.error('Invalid QR code format. Please scan a valid attendance QR code.');
        setShowQRScanner(false);
        return;
      }

      const [classId, qrId, timestamp] = parts;

      // 1. Get Geolocation
      let location;
      try {
        toast.info('Getting your location...', { id: 'location-toast', duration: 5000 });
        location = await getGeolocation();
        toast.dismiss('location-toast');
      } catch (error) {
        toast.error('Location Check Failed', {
          description: error.message + '. Attendance requires your current location.',
        });
        setShowQRScanner(false);
        return;
      }

      // Client-side duplicate check
      const isDuplicate = attendance.some(
        record => record.qr_code_id === qrId && record.class_id === classId
      );

      if (isDuplicate) {
        toast.error('Attendance already marked for this session!', {
          description: 'You have already scanned this QR code'
        });
        setShowQRScanner(false);
        return;
      }

      // Check if QR code is expired (basic client-side check)
      const expiryTime = parseInt(timestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > expiryTime) {
        toast.error('This QR code has expired', {
          description: 'Please ask your teacher for a new QR code'
        });
        setShowQRScanner(false);
        return;
      }

      // Mark attendance via API, including geolocation
      const response = await axios.post(`${API}/attendance/mark`, { 
        qr_content: qrContent,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      
	      if (response.data.status === 'duplicate') {
	        toast.info('Attendance already marked for this session', {
	          description: 'You have already scanned this QR code for this session.'
	        });
	      } else {
	        // Success toast as requested: "Attendance is marked" and close scanner
	        toast.success('Attendance is marked', {
	          description: response.data.blockchain_hash 
	            ? `Blockchain verified: ${response.data.blockchain_hash.substring(0, 8)}...` 
	            : 'Recorded successfully'
	        });
	      }
	      
	      setShowQRScanner(false); // Close scanner on success/duplicate
	      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Attendance marking error:', error);
      const errorMessage = error.response?.data?.detail || 'An error occurred while marking attendance';
      
      // Handle specific error cases with clear messages
	      if (errorMessage.toLowerCase().includes('expired')) {
	        toast.error('Failed to mark attendance', {
	          description: 'The QR code has expired. Please get a new one from your teacher.'
	        });
	      } else if (errorMessage.toLowerCase().includes('invalid')) {
	        toast.error('Failed to mark attendance', {
	          description: 'Invalid QR code or format. Please scan a valid attendance QR code.'
	        });
	      } else {
	        toast.error('Failed to mark attendance', {
	          description: errorMessage
	        });
	      }
	      
	      setShowQRScanner(false); // Close scanner on error
    }
  };

  if (loading && attendance.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{user?.name || 'Student'}</Badge>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
          </nav>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_attendance || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Enrolled Classes</CardTitle>
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.enrolled_classes || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.attendance_percentage || 0}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recent_attendance?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Insights</CardTitle>
                <CardDescription>Visual summary of your attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceGraphs attendance={attendance} />
              </CardContent>
            </Card>

            {/* Mark Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Scan or paste the QR code from your teacher</CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <QrCode className="mr-2 h-4 w-4" />
                      Scan QR Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Mark Attendance</DialogTitle>
                      <DialogDescription>
                        Scan or paste the QR code content from your teacher
                      </DialogDescription>
                    </DialogHeader>
                    <QRScanner 
                      onScan={markAttendance}
                      onClose={() => setShowQRScanner(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Attendance History</CardTitle>
                    <CardDescription>Your complete attendance record</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No attendance records yet</p>
                    <p className="text-sm mt-2">Start by scanning a QR code from your teacher</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendance.map((record) => (
                      <AttendanceCard key={record.id} record={record} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'profile' && (
          <StudentProfile user={user} onUpdate={fetchData} />
        )}
      </main>

      {/* Alert Dialog Modal */}
      {alertDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 ${
                alertDialog.type === 'success' ? 'text-green-600' : 
                alertDialog.type === 'warning' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {alertDialog.type === 'success' ? (
                  <CheckCircle className="h-8 w-8" />
                ) : (
                  <AlertCircle className="h-8 w-8" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {alertDialog.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {alertDialog.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setAlertDialog({ show: false, title: '', message: '', type: 'error' })}
                className={
                  alertDialog.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  alertDialog.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-red-600 hover:bg-red-700'
                }
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default StudentDashboard;
