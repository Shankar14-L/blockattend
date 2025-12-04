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
// QR Scanner Component with Camera Zoom + Manual Input

const QRScanner = ({ onScan, onClose }) => {
  const [manualInput, setManualInput] = useState('');
  const [scanMode, setScanMode] = useState('manual');
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [qrPosition, setQrPosition] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // CSS-based zoom implementation (works on all browsers)
  useEffect(() => {
    if (scanMode === 'camera') {
      const video = document.querySelector('video');
      if (video) {
        video.style.transform = `scale(${zoomLevel})`;
        video.style.transformOrigin = 'center center';
      }
    }
  }, [zoomLevel, scanMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
    toast.success(`Zoom: ${Math.min(zoomLevel + 0.5, 4).toFixed(1)}x`);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
    toast.success(`Zoom: ${Math.max(zoomLevel - 0.5, 1).toFixed(1)}x`);
  };

  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoomLevel(newZoom);
  };

  const handleCameraScan = (data) => {
    if (data && data.text && !scanning) {
      setScanning(true);
      
      // Extract QR code position if available
      if (data.location) {
        setQrPosition(data.location);
      }
      
      onScan(data.text);
      toast.success('QR Code detected!');
      
      // Reset after delay
      setTimeout(() => {
        setScanning(false);
        setQrPosition(null);
      }, 2000);
    }
  };

  const handleCameraError = (err) => {
    console.error('Camera error:', err);
    setCameraError(err?.message || 'Camera access denied or not available');
    toast.error('Camera error. Please use Manual Input or check camera permissions.');
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    } else {
      toast.error('Please enter QR code content');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => {
            setScanMode('manual');
            setCameraError(null);
          }}
          className={`flex-1 py-2 px-4 rounded transition-colors ${
            scanMode === 'manual' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Manual Input
        </button>
        <button
          onClick={() => {
            setScanMode('camera');
            setCameraError(null);
            setScanning(false);
            setQrPosition(null);
          }}
          className={`flex-1 py-2 px-4 rounded transition-colors ${
            scanMode === 'camera' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Camera className="inline-block h-4 w-4 mr-2" />
          Camera Scan
        </button>
      </div>

      {/* Camera Mode */}
      {scanMode === 'camera' ? (
        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative w-full rounded-lg overflow-hidden bg-black">
            {cameraError ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <p className="text-sm mb-2">Camera Error</p>
                  <p className="text-xs opacity-75">{cameraError}</p>
                </div>
              </div>
            ) : (
              <div className="relative h-80 overflow-hidden">
                <div style={{ 
                  width: '100%', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QrReader
                    delay={300}
                    onError={handleCameraError}
                    onScan={handleCameraScan}
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    constraints={{ 
                      video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                      } 
                    }}
                  />
                </div>
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Animated scanning frame */}
                  <div 
                    className="absolute transition-all duration-300 ease-in-out"
                    style={{
                      top: qrPosition ? `${qrPosition.top}px` : '50%',
                      left: qrPosition ? `${qrPosition.left}px` : '50%',
                      transform: qrPosition 
                        ? 'translate(0, 0)' 
                        : 'translate(-50%, -50%)',
                      width: qrPosition ? `${qrPosition.width}px` : '256px',
                      height: qrPosition ? `${qrPosition.height}px` : '256px'
                    }}
                  >
                    {/* Dynamic corner guides */}
                    <div className={`absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 transition-colors duration-300 ${
                      scanning ? 'border-green-500' : 'border-blue-500'
                    }`}></div>
                    <div className={`absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 transition-colors duration-300 ${
                      scanning ? 'border-green-500' : 'border-blue-500'
                    }`}></div>
                    <div className={`absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 transition-colors duration-300 ${
                      scanning ? 'border-green-500' : 'border-blue-500'
                    }`}></div>
                    <div className={`absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 transition-colors duration-300 ${
                      scanning ? 'border-green-500' : 'border-blue-500'
                    }`}></div>
                    
                    {/* Center box */}
                    {!qrPosition && (
                      <div className={`absolute inset-0 border-2 border-dashed rounded-lg transition-colors duration-300 ${
                        scanning ? 'border-green-400' : 'border-blue-400'
                      }`}></div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-center py-3 px-4">
                    {scanning ? (
                      <span className="flex items-center justify-center gap-2 text-green-400 font-medium">
                        <CheckCircle className="h-5 w-5 animate-pulse" />
                        QR Code Detected!
                      </span>
                    ) : (
                      <div className="text-sm">
                        <p className="font-medium">Position QR code within the frame</p>
                        <p className="text-xs opacity-75 mt-1">
                          Hold steady • Distance: 20-50cm • Use zoom if needed
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Success overlay */}
                {scanning && (
                  <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 shadow-2xl animate-pulse">
                      <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                      <p className="text-sm font-medium mt-3 text-gray-800">Processing...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {!cameraError && (
            <div className="space-y-3">
              {/* Zoom Controls */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Digital Zoom</Label>
                  <span className="text-sm font-bold text-blue-600">
                    {zoomLevel.toFixed(1)}x
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="h-10 w-10 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={zoomLevel}
                      onChange={handleZoomChange}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoomLevel - 1) / 3) * 100}%, #cbd5e1 ${((zoomLevel - 1) / 3) * 100}%, #cbd5e1 100%)`
                      }}
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 4}
                    className="h-10 w-10 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Quick zoom presets */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setZoomLevel(1)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded transition-colors ${
                      zoomLevel === 1 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => setZoomLevel(2)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded transition-colors ${
                      zoomLevel === 2 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    2x
                  </button>
                  <button
                    onClick={() => setZoomLevel(3)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded transition-colors ${
                      zoomLevel === 3 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    3x
                  </button>
                  <button
                    onClick={() => setZoomLevel(4)}
                    className={`flex-1 py-1.5 px-3 text-xs rounded transition-colors ${
                      zoomLevel === 4 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    4x
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Camera Tips */}
          <Alert>
            <Camera className="h-4 w-4" />
            <AlertDescription>
              <div className="text-xs space-y-1">
                <p><strong>Scanning Tips:</strong></p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                  <li>Hold device steady and parallel to QR code</li>
                  <li>Ensure good lighting (avoid glare and shadows)</li>
                  <li><strong>Close range:</strong> Use 1-2x zoom, distance 20-30cm</li>
                  <li><strong>Far range (projector):</strong> Use 3-4x zoom, distance 1-3m</li>
                  <li>Frame will turn green when QR is detected</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {cameraError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Camera Access Error</p>
                <p className="text-xs mt-1">
                  Please enable camera permissions in your browser settings or use Manual Input mode.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        /* Manual Input Mode */
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2">Paste QR Code Content</Label>
            <Textarea
              className="w-full font-mono text-sm"
              rows={4}
              placeholder="Example: class-id-123|qr-id-456|1234567890"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
          </div>
          <Button
            onClick={handleManualSubmit}
            className="w-full"
            disabled={!manualInput.trim()}
          >
            <QrCode className="mr-2 h-4 w-4" />
            Submit QR Content
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Format:</strong> class_id|qr_id|timestamp<br/>
              Copy this from teacher's "Copy Content" button on the QR display
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Close Button */}
      <Button
        variant="outline"
        onClick={onClose}
        className="w-full"
      >
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
