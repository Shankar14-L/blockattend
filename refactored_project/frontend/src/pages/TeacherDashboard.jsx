import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger , DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { QrCode, Users, BookOpen, Shield, TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw, LogOut, Edit2, Save, X, Copy, ExternalLink, Key, Award, User, Mail, Wallet, Calendar, Building, Phone, Globe } from 'lucide-react';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast'; // Assuming this is the correct hook path

// Placeholder for QR Code Display
// Placeholder for QR Code Display - UPDATED
const QRCodeDisplay = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No QR code data available</p>
      </div>
    );
  }

  // Check if data is a base64 image or needs to be converted
  const isBase64Image = typeof data === 'string' && (data.startsWith('data:image') || data.length > 100);
  
  return (
    <div className="flex flex-col items-center space-y-4">
      {isBase64Image ? (
        <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-200">
          <img
            src={data.startsWith('data:') ? data : `data:image/png;base64,${data}`}
            alt="Attendance QR Code"
            className="w-64 h-64 mx-auto"
          />
        </div>
      ) : (
        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">QR Code Preview</p>
          </div>
        </div>
      )}
      
      <div className="w-full">
        <Label className="text-sm text-gray-600">QR Content:</Label>
        <div className="mt-1 p-3 bg-gray-50 rounded border break-all">
          <p className="text-xs font-mono text-gray-700">{typeof data === 'string' ? data : JSON.stringify(data)}</p>
        </div>
      </div>
      
      <div className="flex gap-2 w-full">
        <Button 
          variant="outline"
          className="flex-1"
          onClick={() => {
            const content = typeof data === 'object' ? JSON.stringify(data) : data;
            navigator.clipboard.writeText(content).then(() => toast.success('QR Content copied!'));
          }}
        >
          <Copy className="mr-2 h-4 w-4" /> Copy Content
        </Button>
        
        {isBase64Image && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const link = document.createElement('a');
              link.href = data.startsWith('data:') ? data : `data:image/png;base64,${data}`;
              link.download = `qr-code-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success('QR code downloaded!');
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Download
          </Button>
        )}
      </div>
    </div>
  );
};

// Placeholder for ClassAttendanceViewer
const ClassAttendanceViewer = ({ classId, className, attendance, onClose, API }) => {
  const handleExportCSV = () => {
    if (!API) {
      toast.error('API configuration missing. Cannot export CSV.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token missing.');
      return;
    }

    // Trigger file download by fetching the blob and then triggering the download
    const url = `${API}/attendance/class/${classId}/export-csv`;
    
    axios.get(url, {
      responseType: 'blob', // Important for file downloads
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `attendance_export_${classId}.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length === 2)
          filename = filenameMatch[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV export started!');
    })
    .catch(error => {
      console.error('CSV export error:', error);
      toast.error('Failed to export attendance data.');
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">{className} Attendance Records</h3>
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="max-h-96 overflow-y-auto space-y-2">
        {attendance.length === 0 ? (
          <p className="text-gray-500">No attendance records for this class yet.</p>
        ) : (
          attendance.map((record) => (
            <Card key={record.id} className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{record.student_name || 'Student'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(record.timestamp).toLocaleString()} | Hash: {record.blockchain_hash.substring(0, 8)}...
                  </p>
                </div>
                <Badge variant={record.status === 'Present' ? 'default' : 'secondary'}>
                  {record.status || 'Present'}
                </Badge>
              </div>
            </Card>
          ))
        )}
      </div>
      <Button onClick={onClose} className="w-full">Close Viewer</Button>
    </div>
  );
};

// TeacherProfile Component (from pasted_content_2.txt)
const TeacherProfile = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metamaskConnected, setMetamaskConnected] = useState(false);
  const [metamaskAddress, setMetamaskAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [networkName, setNetworkName] = useState('');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    teacher_id: user?.teacher_id || user?.id || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    department: user?.department || '',
    designation: user?.designation || '',
    officeHours: user?.officeHours || '',
    officeLocation: user?.officeLocation || '',
    specialization: user?.specialization || '',
    website: user?.website || '',
    researchInterests: user?.researchInterests || ''
  });

  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    recentAttendance: 0,
    activeQRCodes: 0
  });

  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', address: '', role: 'student' });

  const [classes, setClasses] = useState([]);

  useEffect(() => {
    checkMetaMaskConnection();
    fetchProfileStats();
    fetchTeacherClasses();
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
    // Placeholder
    setWalletBalance('0.0000');
    setNetworkName('Test Network');
  };

  const getNetworkName = async () => {
    // Placeholder
    setNetworkName('Test Network');
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
      const response = await axios.get(`${API}/dashboard/teacher-stats`);
      
      const data = response.data;
      setStats({
        totalClasses: data.total_classes || 0,
        totalStudents: data.total_students || 0,
        recentAttendance: data.recent_attendance?.length || 0,
        activeQRCodes: data.active_qrcodes || 0
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  const fetchTeacherClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      
      setClasses(response.data || []);
    } catch (error) {
      console.error('Classes fetch error:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await axios.put(`${API}/user/profile`, formData);

      const updatedUser = response.data;
      if (onUpdate) onUpdate(updatedUser);
      
      setIsEditing(false);
      toast.success('Profile updated successfully!');
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
    const saved = localStorage.getItem('teacher_contacts');
    if (saved) {
      setContacts(JSON.parse(saved));
    }
  };

  const saveContacts = (newContacts) => {
    localStorage.setItem('teacher_contacts', JSON.stringify(newContacts));
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
    setNewContact({ name: '', address: '', role: 'student' });
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
      classes,
      metamaskAddress,
      contacts,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher_profile_${formData.teacher_id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Profile data exported!');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account and teaching credentials</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
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
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeQRCodes}</div>
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
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Details about your teaching profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="teacher_id">Teacher ID</Label>
                <Input 
                  id="teacher_id" 
                  value={formData.teacher_id} 
                  disabled 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="designation">Designation</Label>
                <Input 
                  id="designation" 
                  value={formData.designation} 
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="department">Department</Label>
                <Input 
                  id="department" 
                  value={formData.department} 
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="officeLocation">Office Location</Label>
                <Input 
                  id="officeLocation" 
                  value={formData.officeLocation} 
                  onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="officeHours">Office Hours</Label>
                <Input 
                  id="officeHours" 
                  value={formData.officeHours} 
                  onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="website">Website / Personal Page</Label>
                <Input 
                  id="website" 
                  value={formData.website} 
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                  disabled={!isEditing} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="specialization">Specialization</Label>
              <Textarea 
                id="specialization" 
                value={formData.specialization} 
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} 
                disabled={!isEditing} 
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="researchInterests">Research Interests</Label>
              <Textarea 
                id="researchInterests" 
                value={formData.researchInterests} 
                onChange={(e) => setFormData({ ...formData, researchInterests: e.target.value })} 
                disabled={!isEditing} 
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blockchain Wallet</CardTitle>
            <CardDescription>Connect your MetaMask wallet for blockchain interactions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metamaskConnected ? (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Wallet connected successfully on {networkName}.
                  </AlertDescription>
                </Alert>
                <div className="space-y-1">
                  <Label>Wallet Address</Label>
                  <div className="flex items-center space-x-2">
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
                <div className="space-y-1">
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
                    Wallet is not connected. Connect to enable blockchain features.
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
          <CardTitle>Classes Taught</CardTitle>
          <CardDescription>List of classes you are currently teaching.</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-gray-500">No classes assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div key={cls.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-sm text-gray-500">Code: {cls.code} | Students: {cls.student_count}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{cls.semester}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Contacts (Local)</CardTitle>
          <CardDescription>Manage frequently used wallet addresses for transfers (stored locally).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-gray-500">No contacts saved.</p>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{contact.name} <Badge variant="secondary">{contact.role}</Badge></p>
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
                <DialogDescription id="dlg-desc-0">Description for dialog.</DialogDescription>
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
                <Select onValueChange={(value) => setNewContact({ ...newContact, role: value })} defaultValue={newContact.role}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addContact} className="w-full">Save Contact</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};


// Main TeacherDashboard Component (from original App.js logic)
const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'profile'

  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);

  // QR Modal States
  const [showQRModal, setShowQRModal] = useState(false);
  const [lastQrResponse, setLastQrResponse] = useState(null);

  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Attendance viewer
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [classAttendance, setClassAttendance] = useState([]);
  const [showAttendanceViewer, setShowAttendanceViewer] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const statsResponse = await axios.get(`${API}/dashboard/teacher-stats`);
      const classesResponse = await axios.get(`${API}/classes`);
      
      setStats(statsResponse.data);
      setClasses(classesResponse.data);
    } catch (error) {
      console.error('Data fetch error:', error);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createClass = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newClass = {
      name: formData.get('name'),
      code: formData.get('code'),
      semester: formData.get('semester'),
    };

    try {
      const response = await axios.post(`${API}/classes/create`, newClass);
      toast.success(`Class "${response.data.name}" created successfully!`);
      setShowCreateClass(false);
      fetchData();
    } catch (error) {
      console.error('Class creation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create class');
    }
  };

// TeacherDashboard.jsx - FIXED QR GENERATION SECTION
// Replace the generateQRCode function with this updated version:

const generateQRCode = async (classId) => {
  setQrLoading(true);
  
  // Show loading toast
  const loadingToast = toast.loading('Generating QR Code...', {
    description: 'Creating blockchain session'
  });
  
  try {
    const response = await axios.post(`${API}/attendance/generate-qr`, { 
      class_id: classId 
    });

    console.log("✅ QR generated successfully:", response?.data);

    const fullQrData = response.data;
    
    setQrData(fullQrData);
    setLastQrResponse(fullQrData);
    setShowQRModal(true);
    
    // Dismiss loading toast and show success
    toast.dismiss(loadingToast);
    toast.success('QR Code Generated Successfully!', {
      description: `Session for ${fullQrData.class_name} is active for 5 minutes.`,
      duration: 5000
    });
    
  } catch (error) {
    console.error("❌ QR generation error:", error);
    const errorMessage = error.response?.data?.detail || 'Failed to generate QR code';
    
    // Dismiss loading toast and show error
    toast.dismiss(loadingToast);
    
    if (errorMessage.includes("Failed to create blockchain session")) {
      toast.error("Blockchain Session Failed", {
        description: "Could not create blockchain session. Please check server logs and try again.",
        duration: 7000
      });
    } else {
      toast.error("Failed to Generate QR", {
        description: errorMessage,
        duration: 5000
      });
    }
  } finally {
    setQrLoading(false);
  }
};

// Also add this helper function for the QR modal close handler:
const handleQRModalClose = () => {
  setShowQRModal(false);
  toast.info('QR Session Active', {
    description: 'Session will expire in 5 minutes',
    duration: 3000
  });
};

  const viewAttendance = async (classId, className) => {
    try {
      const response = await axios.get(`${API}/attendance/class/${classId}`);
      setClassAttendance(response.data);
      setSelectedClassId(classId);
      setSelectedClassName(className);
      setShowAttendanceViewer(true);
    } catch (error) {
      console.error('Attendance fetch error:', error);
      toast.error(error.response?.data?.detail || 'Failed to fetch attendance');
    }
  };

  const closeAttendanceViewer = () => {
    setShowAttendanceViewer(false);
    setClassAttendance([]);
    setSelectedClassId(null);
    setSelectedClassName('');
  };

  const handleUserUpdate = (updatedUser) => {
    console.log('User updated:', updatedUser);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">{user?.name || 'Teacher'}</Badge>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_classes || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_students || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Attendance</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recent_attendance?.length || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active QR Codes</CardTitle>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.active_qrcodes || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>My Classes</CardTitle>
                  <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
                    <DialogTrigger asChild>
                      <Button size="sm">Create New Class</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Class</DialogTitle>
                        <DialogDescription id="dlg-desc-1">Description for dialog.</DialogDescription>
</DialogHeader>
                      <form onSubmit={createClass} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Class Name</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code">Class Code</Label>
                          <Input id="code" name="code" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="semester">Semester</Label>
                          <Input id="semester" name="semester" required />
                        </div>
                        <Button type="submit" className="w-full">Create Class</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No classes created yet. Click "Create New Class" to start.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <Card key={cls.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{cls.name}</p>
                            <p className="text-sm text-gray-500">Code: {cls.code} | Semester: {cls.semester}</p>
                          </div>
	                          <div className="flex space-x-2">
	                            <Button 
	                              variant="outline" 
	                              size="sm" 
	                              onClick={() => viewAttendance(cls.id, cls.name)}
	                            >
	                              View Attendance
	                            </Button>
	                            <Button 
	                              size="sm" 
	                              onClick={() => generateQRCode(cls.id)}
	                              disabled={qrLoading}
	                            >
	                              <QrCode className="mr-2 h-4 w-4" />
	                              Generate QR
	                            </Button>
	                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Code Modal */}
<Dialog open={showQRModal} onOpenChange={setShowQRModal}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Attendance QR Code</DialogTitle>
      <DialogDescription>
        Display this QR code for students to scan
      </DialogDescription>
    </DialogHeader>
    
    {qrData ? (
      <div className="space-y-4">
        {/* QR Code Display */}
        {qrData.qr_code || qrData.qr_base64 ? (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-200 inline-block">
              <img
                src={`data:image/png;base64,${qrData.qr_code || qrData.qr_base64}`}
                alt="Attendance QR Code"
                className="w-64 h-64 mx-auto"
                onError={(e) => {
                  console.error('Image load error');
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }} className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600">Failed to load QR image</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">QR code not available</p>
          </div>
        )}
        
        {/* QR Info */}
        <div className="text-left space-y-2 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class:</span>
            <span className="text-sm font-medium">{qrData.class_name || 'Unknown'}</span>
          </div>
          {(qrData.session_id || qrData.sessionId || qrData.qr_id) && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Session ID:</span>
              <span className="text-sm font-mono">
                {(qrData.session_id || qrData.sessionId || qrData.qr_id).substring(0, 12)}...
              </span>
            </div>
          )}
          {qrData.expires_at && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Expires:</span>
              <span className="text-sm font-medium">
                {new Date(qrData.expires_at).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        
        {/* Warning */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            This QR code expires in 5 minutes. Generate a new one if needed.
          </AlertDescription>
        </Alert>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              const sessionId = qrData.session_id || qrData.sessionId || qrData.qr_id;
              const content = `${qrData.class_id}|${sessionId}|${qrData.expires_at}`;
              navigator.clipboard.writeText(content);
              toast.success('QR content copied to clipboard!');
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Content
          </Button>
          <Button 
            variant="outline"
            className="flex-1"
            onClick={() => {
              const qrImage = qrData.qr_code || qrData.qr_base64;
              if (qrImage) {
                const link = document.createElement('a');
                link.href = `data:image/png;base64,${qrImage}`;
                link.download = `qr-${qrData.class_id}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('QR code downloaded!');
              }
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
        
        <Button 
          className="w-full"
          onClick={() => setShowQRModal(false)}
        >
          Close
        </Button>
      </div>
    ) : (
      <div className="text-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading QR code...</p>
      </div>
    )}
  </DialogContent>
</Dialog>
	            {/* Attendance Viewer Modal */}
	            <Dialog open={showAttendanceViewer} onOpenChange={setShowAttendanceViewer}>
	              <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Class Attendance</DialogTitle>
                    <DialogDescription>Records for {selectedClassName}</DialogDescription>
                  </DialogHeader>
                  <ClassAttendanceViewer 
                    classId={selectedClassId}
                    className={selectedClassName}
                    attendance={classAttendance}
                    onClose={closeAttendanceViewer}
                    API={API} // Pass API to the component
                  />
	              </DialogContent>
	            </Dialog>
          </div>
        )}

        {activeTab === 'profile' && (
          <TeacherProfile user={user} onUpdate={handleUserUpdate} />
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
