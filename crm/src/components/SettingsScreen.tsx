import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Modal,
  Share,
  Switch,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setAuth, logoutUser } from '../store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApiFetch, getBaseUrl, getImageUrl, uploadMobileFile } from '../api/client';
import { TOKENS } from '../theme/tokens';
// Safe lazy helper for react-native-image-picker to prevent startup crashes on older APK builds
let imagePickerModule: any = null;
function getImagePicker() {
  if (!imagePickerModule) {
    try {
      imagePickerModule = require('react-native-image-picker');
    } catch (e) {
      console.warn('[SettingsScreen] react-native-image-picker native module is not available in binary:', e);
    }
  }
  return imagePickerModule;
}
import { 
  showSuccess, 
  showError, 
  showConfirm 
} from '../services/alertService';
import { unregisterDeviceToken } from '../services/pushNotification';
import { 
  User as UserIcon, 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Lock, 
  Key, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  Check, 
  Shield, 
  Globe, 
  Share2, 
  LogOut, 
  Search, 
  Tag, 
  Volume2, 
  Layers,
  X,
  Camera,
  Upload
} from 'lucide-react-native';

interface SettingsScreenProps {
  onBack?: () => void;
  initialTab?: 'profile' | 'company' | 'team';
}

const PRESET_COLORS = [
  '#2563eb', // Royal Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#64748b', // Slate
];

export default function SettingsScreen({ onBack, initialTab }: SettingsScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Responsive breakpoints
  const isSmallScreen = windowWidth < 360;
  const isTablet = windowWidth >= 640;
  const isLandscape = windowWidth > windowHeight && windowHeight < 550;

  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const currentUser = auth.user;
  const isStaff = currentUser?.role === 'staff';

  // Tabs: 'profile' | 'company' | 'team'
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'team'>(
    initialTab || (isStaff ? 'profile' : 'company')
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Profile State ---
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    avatar: currentUser?.avatar || currentUser?.companyLogo || '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadTarget, setImageUploadTarget] = useState<'profile' | 'company'>('profile');

  // --- Company State ---
  const [company, setCompany] = useState<{
    id?: number;
    company_name: string;
    website: string;
    email: string;
    phone: string;
    logo?: string;
    api_key: string;
    subscription_plan?: string;
  }>({
    company_name: currentUser?.companyName || '',
    website: currentUser?.Company?.website || '',
    email: currentUser?.Company?.email || '',
    phone: currentUser?.Company?.phone || '',
    logo: currentUser?.companyLogo || '',
    api_key: currentUser?.Company?.api_key || '',
    subscription_plan: '',
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  // --- Pipeline Statuses & Sources ---
  const [statuses, setStatuses] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#2563eb');
  const [addingStatus, setAddingStatus] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [addingSource, setAddingSource] = useState(false);

  // --- Team Members State ---
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
  });
  const [memberSaving, setMemberSaving] = useState(false);
  const [showMemberPassword, setShowMemberPassword] = useState(false);

  // Edit Member Modal
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
  });
  const [editMemberSaving, setEditMemberSaving] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Load sound setting from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('crm_sound_enabled').then((val) => {
      if (val !== null) {
        setSoundEnabled(val === 'true');
      }
    });
  }, []);

  const handleToggleSound = async (value: boolean) => {
    setSoundEnabled(value);
    await AsyncStorage.setItem('crm_sound_enabled', value ? 'true' : 'false');
  };

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      // 1. Refresh user profile form from state or stored
      if (currentUser) {
        setProfileForm(prev => ({
          ...prev,
          name: currentUser.name || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          avatar: currentUser.avatar || currentUser.companyLogo || '',
        }));
      }

      // Fetch fresh profile for all roles
      try {
        const resProf = await mobileApiFetch('/api/settings/profile');
        if (resProf.ok) {
          const profData = await resProf.json();
          if (profData?.user) {
            const u = profData.user;
            setProfileForm(prev => ({
              ...prev,
              name: u.name || '',
              email: u.email || '',
              phone: u.phone || '',
              avatar: u.avatar || u.companyLogo || '',
            }));
            const updatedUser = { ...currentUser, ...u };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            dispatch(setAuth({ token: auth.token, user: updatedUser }));
          }
        }
      } catch (e) {
        console.warn('[Settings] Failed to fetch fresh profile:', e);
      }

      // If user is not staff, fetch company, pipeline, and team data
      if (!isStaff) {
        // Fetch company
        try {
          const resComp = await mobileApiFetch('/api/settings/company');
          if (resComp.ok) {
            const dataComp = await resComp.json();
            if (dataComp.company) {
              setCompany({
                id: dataComp.company.id,
                company_name: dataComp.company.company_name || '',
                website: dataComp.company.website || '',
                email: dataComp.company.email || '',
                phone: dataComp.company.phone || '',
                logo: dataComp.company.logo || '',
                api_key: dataComp.company.api_key || '',
                subscription_plan: dataComp.company.subscription_plan || '',
              });
            }
          }
        } catch (e) {
          console.warn('[Settings] Failed to fetch company:', e);
        }

        // Fetch lead statuses
        try {
          const resStat = await mobileApiFetch('/api/leads/statuses');
          if (resStat.ok) {
            const dataStat = await resStat.json();
            setStatuses(dataStat.statuses || []);
          }
        } catch (e) {
          console.warn('[Settings] Failed to fetch statuses:', e);
        }

        // Fetch lead sources
        try {
          const resSrc = await mobileApiFetch('/api/leads/sources');
          if (resSrc.ok) {
            const dataSrc = await resSrc.json();
            setSources(dataSrc.sources || []);
          }
        } catch (e) {
          console.warn('[Settings] Failed to fetch sources:', e);
        }

        // Fetch team members
        try {
          const resTeam = await mobileApiFetch('/api/users');
          if (resTeam.ok) {
            const dataTeam = await resTeam.json();
            setTeamMembers(dataTeam.users || []);
          }
        } catch (e) {
          console.warn('[Settings] Failed to fetch team members:', e);
        }
      }
    } catch (err) {
      console.error('[Settings] Error loading settings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, isStaff]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Profile Submit
  const handleProfileSubmit = async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      showError('Required Fields', 'Full Name and Email Address are required.', undefined, 'Proceed');
      return;
    }

    setProfileSaving(true);
    try {
      const payload: any = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        avatar: profileForm.avatar || null,
      };
      if (profileForm.password.trim() !== '') {
        payload.password = profileForm.password;
      }

      const res = await mobileApiFetch('/api/settings/profile', {
        method: 'PUT',
        bodyData: payload,
      });

      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...currentUser, ...data.user };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch(setAuth({ token: auth.token, user: updatedUser }));
        setProfileForm(prev => ({ ...prev, password: '' }));
        showSuccess('Profile Saved', 'Your profile details have been updated successfully.', undefined, 'Proceed');
      } else {
        showError('Update Failed', data.error || 'Failed to update profile details.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Network Error', err.message || 'Unable to update profile. Please try again.', undefined, 'Proceed');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Pick Image from Local Device Gallery
  const handlePickFromGallery = async () => {
    try {
      const picker = getImagePicker();
      if (!picker?.launchImageLibrary) {
        showError(
          'Feature Unavailable',
          'Gallery picker native module is not linked in this APK build. Please update the app or enter an image URL directly.',
          undefined,
          'Proceed'
        );
        return;
      }

      const response = await picker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (response.didCancel) return;
      if (response.errorCode) {
        showError('Gallery Error', response.errorMessage || 'Failed to open photo library.', undefined, 'Proceed');
        return;
      }

      const asset = response.assets?.[0];
      if (!asset || !asset.uri) return;

      setUploadingImage(true);
      const res = await uploadMobileFile(
        asset.uri,
        asset.fileName || `avatar_${Date.now()}.jpg`,
        asset.type || 'image/jpeg'
      );

      const data = await res.json();
      if (res.ok && data.url) {
        if (imageUploadTarget === 'company') {
          setCompany(prev => ({ ...prev, logo: data.url }));
          setImageUrlInput(data.url);
          setImageModalOpen(false);

          try {
            const targetCid = company.id || currentUser?.companyId || currentUser?.company_id;
            const saveRes = await mobileApiFetch('/api/settings/company', {
              method: 'PUT',
              bodyData: {
                ...company,
                logo: data.url,
                company_id: targetCid,
              },
            });
            const saveData = await saveRes.json();
            if (saveRes.ok) {
              const token = await AsyncStorage.getItem('token');
              const updatedUser = { 
                ...currentUser, 
                companyName: saveData.company?.company_name || currentUser?.companyName,
                companyLogo: data.url 
              };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              dispatch(setAuth({ token, user: updatedUser }));
            }
          } catch (e) {
            console.warn('Auto-save company logo error:', e);
          }

          showSuccess('Logo Uploaded', 'Company logo has been uploaded and saved.', undefined, 'Proceed');
        } else {
          setProfileForm(prev => ({ ...prev, avatar: data.url }));
          setImageUrlInput(data.url);
          setImageModalOpen(false);

          // Auto-save to profile
          try {
            const saveRes = await mobileApiFetch('/api/settings/profile', {
              method: 'PUT',
              bodyData: {
                name: profileForm.name.trim() || currentUser?.name,
                email: profileForm.email.trim() || currentUser?.email,
                phone: profileForm.phone.trim() || currentUser?.phone,
                avatar: data.url,
              },
            });
            const saveData = await saveRes.json();
            if (saveRes.ok && saveData.user) {
              const token = await AsyncStorage.getItem('token');
              const updatedUser = { ...currentUser, ...saveData.user, avatar: data.url };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              dispatch(setAuth({ token, user: updatedUser }));
            }
          } catch (e) {
            console.warn('Auto-save error:', e);
          }

          showSuccess('Photo Uploaded', 'Your profile image has been uploaded and updated.', undefined, 'Proceed');
        }
      } else {
        showError('Upload Failed', data.error || 'Failed to upload selected image.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Upload Error', err.message || 'An error occurred during image upload.', undefined, 'Proceed');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Capture Photo with Device Camera
  const handleTakePhoto = async () => {
    try {
      const picker = getImagePicker();
      if (!picker?.launchCamera) {
        showError(
          'Feature Unavailable',
          'Camera native module is not linked in this APK build. Please update the app or enter an image URL directly.',
          undefined,
          'Proceed'
        );
        return;
      }

      const response = await picker.launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (response.didCancel) return;
      if (response.errorCode) {
        showError('Camera Error', response.errorMessage || 'Failed to open camera.', undefined, 'Proceed');
        return;
      }

      const asset = response.assets?.[0];
      if (!asset || !asset.uri) return;

      setUploadingImage(true);
      const res = await uploadMobileFile(
        asset.uri,
        asset.fileName || `camera_${Date.now()}.jpg`,
        asset.type || 'image/jpeg'
      );

      const data = await res.json();
      if (res.ok && data.url) {
        if (imageUploadTarget === 'company') {
          setCompany(prev => ({ ...prev, logo: data.url }));
          setImageUrlInput(data.url);
          setImageModalOpen(false);

          try {
            const targetCid = company.id || currentUser?.companyId || currentUser?.company_id;
            const saveRes = await mobileApiFetch('/api/settings/company', {
              method: 'PUT',
              bodyData: {
                ...company,
                logo: data.url,
                company_id: targetCid,
              },
            });
            const saveData = await saveRes.json();
            if (saveRes.ok) {
              const token = await AsyncStorage.getItem('token');
              const updatedUser = { 
                ...currentUser, 
                companyName: saveData.company?.company_name || currentUser?.companyName,
                companyLogo: data.url 
              };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              dispatch(setAuth({ token, user: updatedUser }));
            }
          } catch (e) {
            console.warn('Auto-save company logo error:', e);
          }

          showSuccess('Logo Uploaded', 'Company logo has been captured and saved.', undefined, 'Proceed');
        } else {
          setProfileForm(prev => ({ ...prev, avatar: data.url }));
          setImageUrlInput(data.url);
          setImageModalOpen(false);

          // Auto-save to profile
          try {
            const saveRes = await mobileApiFetch('/api/settings/profile', {
              method: 'PUT',
              bodyData: {
                name: profileForm.name.trim() || currentUser?.name,
                email: profileForm.email.trim() || currentUser?.email,
                phone: profileForm.phone.trim() || currentUser?.phone,
                avatar: data.url,
              },
            });
            const saveData = await saveRes.json();
            if (saveRes.ok && saveData.user) {
              const token = await AsyncStorage.getItem('token');
              const updatedUser = { ...currentUser, ...saveData.user, avatar: data.url };
              await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              dispatch(setAuth({ token, user: updatedUser }));
            }
          } catch (e) {
            console.warn('Auto-save error:', e);
          }

          showSuccess('Photo Uploaded', 'Your profile image has been captured and updated.', undefined, 'Proceed');
        }
      } else {
        showError('Upload Failed', data.error || 'Failed to upload photo.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Camera Error', err.message || 'An error occurred capturing photo.', undefined, 'Proceed');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Remove Company Logo
  const handleRemoveCompanyLogo = async () => {
    setCompany(prev => ({ ...prev, logo: '' }));
    try {
      const targetCid = company.id || currentUser?.companyId || currentUser?.company_id;
      const res = await mobileApiFetch('/api/settings/company', {
        method: 'PUT',
        bodyData: {
          ...company,
          logo: null,
          company_id: targetCid,
        },
      });
      if (res.ok) {
        const token = await AsyncStorage.getItem('token');
        const updatedUser = { ...currentUser, companyLogo: null };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch(setAuth({ token, user: updatedUser }));
        showSuccess('Logo Removed', 'Company logo has been removed.', undefined, 'Proceed');
      }
    } catch (e: any) {
      console.warn('Remove company logo error:', e);
    }
  };

  // Handle Company Submit
  const handleCompanySubmit = async () => {
    if (!company.company_name.trim()) {
      showError('Validation Error', 'Company Name is required.', undefined, 'Proceed');
      return;
    }

    setCompanySaving(true);
    try {
      const targetCid = company.id || currentUser?.companyId || currentUser?.company_id;
      const res = await mobileApiFetch('/api/settings/company', {
        method: 'PUT',
        bodyData: {
          company_name: company.company_name.trim(),
          website: company.website.trim(),
          email: company.email.trim(),
          phone: company.phone.trim(),
          logo: company.logo !== undefined ? (company.logo || null) : undefined,
          company_id: targetCid,
        },
      });

      const data = await res.json();
      if (res.ok) {
        const token = await AsyncStorage.getItem('token');
        const updatedUser = {
          ...currentUser,
          companyName: data.company?.company_name || company.company_name,
          companyLogo: data.company?.logo !== undefined ? data.company.logo : company.logo,
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch(setAuth({ token, user: updatedUser }));

        showSuccess('Company Saved', 'Company configurations have been saved successfully.', undefined, 'Proceed');
      } else {
        showError('Save Failed', data.error || 'Failed to save company settings.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Network Error', err.message || 'Unable to save company settings.', undefined, 'Proceed');
    } finally {
      setCompanySaving(false);
    }
  };

  // Handle Add Status
  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      showError('Stage Name Required', 'Please enter a name for the pipeline stage.', undefined, 'Proceed');
      return;
    }

    setAddingStatus(true);
    try {
      const res = await mobileApiFetch('/api/leads/statuses', {
        method: 'POST',
        bodyData: {
          name: newStatusName.trim(),
          color: selectedColor,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setStatuses(prev => [...prev, data.status]);
        setNewStatusName('');
        showSuccess('Stage Added', `Pipeline stage "${data.status?.name || newStatusName}" added successfully.`, undefined, 'Proceed');
      } else {
        showError('Failed', data.error || 'Could not add pipeline stage.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Error', err.message || 'Failed to create stage.', undefined, 'Proceed');
    } finally {
      setAddingStatus(false);
    }
  };

  // Handle Add Source
  const handleAddSource = async () => {
    if (!newSourceName.trim()) {
      showError('Source Name Required', 'Please enter a name for the acquisition source.', undefined, 'Proceed');
      return;
    }

    setAddingSource(true);
    try {
      const res = await mobileApiFetch('/api/leads/sources', {
        method: 'POST',
        bodyData: {
          source_name: newSourceName.trim(),
        },
      });

      const data = await res.json();
      if (res.ok) {
        setSources(prev => [...prev, data.source]);
        setNewSourceName('');
        showSuccess('Source Added', `Acquisition source "${data.source?.source_name || newSourceName}" added successfully.`, undefined, 'Proceed');
      } else {
        showError('Failed', data.error || 'Could not add acquisition source.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Error', err.message || 'Failed to create source.', undefined, 'Proceed');
    } finally {
      setAddingSource(false);
    }
  };

  // Handle Share / Copy API Key
  const handleShareKey = async () => {
    if (!company.api_key) return;
    try {
      await Share.share({
        title: 'CRM REST API Key',
        message: company.api_key,
      });
    } catch (e) {
      console.warn('Error sharing API key:', e);
    }
  };

  // Handle Regenerate Key
  // const handleRegenerateKey = () => {
  //   showConfirm({
  //     title: 'Regenerate API Key',
  //     message: 'Regenerating will break existing WordPress and webhook integrations using the current key. Continue?',
  //     isDestructive: true,
  //     proceedText: 'Proceed',
  //     cancelText: 'Cancel',
  //     onProceed: async () => {
  //       setRegeneratingKey(true);
  //       try {
  //         const res = await mobileApiFetch('/api/settings/company', {
  //           method: 'POST',
  //         });
  //         const data = await res.json();
  //         if (res.ok && data.api_key) {
  //           setCompany(prev => ({ ...prev, api_key: data.api_key }));
  //           showSuccess('Key Regenerated', 'A new REST API token has been generated successfully.', undefined, 'Proceed');
  //         } else {
  //           showError('Regenerate Failed', data.error || 'Failed to regenerate API key.', undefined, 'Proceed');
  //         }
  //       } catch (err: any) {
  //         showError('Error', err.message || 'Network error while regenerating API key.', undefined, 'Proceed');
  //       } finally {
  //         setRegeneratingKey(false);
  //       }
  //     },
  //   });
  // };

  // Team: Refresh
  const refreshTeam = async () => {
    try {
      const res = await mobileApiFetch('/api/users');
      if (res.ok) {
        const d = await res.json();
        setTeamMembers(d.users || []);
      }
    } catch (e) {
      console.warn('Failed to refresh team:', e);
    }
  };

  // Team: Add Member
  const handleAddMember = async () => {
    if (!memberForm.name.trim() || !memberForm.email.trim() || !memberForm.password.trim()) {
      showError('Required Fields', 'Full Name, Email Address, and Login Password are required.', undefined, 'Proceed');
      return;
    }
    if (memberForm.password.length < 6) {
      showError('Password Too Short', 'Login Password must be at least 6 characters.', undefined, 'Proceed');
      return;
    }

    setMemberSaving(true);
    try {
      const res = await mobileApiFetch('/api/users', {
        method: 'POST',
        bodyData: {
          name: memberForm.name.trim(),
          email: memberForm.email.trim(),
          phone: memberForm.phone.trim(),
          password: memberForm.password,
          role: memberForm.role,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setAddMemberOpen(false);
        setMemberForm({ name: '', email: '', phone: '', password: '', role: 'staff' });
        await refreshTeam();
        showSuccess('Staff Member Added', `Account for "${memberForm.name}" was created successfully.`, undefined, 'Proceed');
      } else {
        showError('Creation Failed', data.error || 'Failed to create team member.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Network Error', err.message || 'Unable to create member.', undefined, 'Proceed');
    } finally {
      setMemberSaving(false);
    }
  };

  // Team: Edit Member
  const handleEditMember = async () => {
    if (!selectedMember) return;
    if (!editMemberForm.name.trim() || !editMemberForm.email.trim()) {
      showError('Required Fields', 'Full Name and Email Address are required.', undefined, 'Proceed');
      return;
    }

    setEditMemberSaving(true);
    try {
      const payload: any = {
        name: editMemberForm.name.trim(),
        email: editMemberForm.email.trim(),
        phone: editMemberForm.phone.trim(),
        role: editMemberForm.role,
      };
      if (editMemberForm.password.trim() !== '') {
        payload.password = editMemberForm.password;
      }

      const res = await mobileApiFetch(`/api/users/${selectedMember.id}`, {
        method: 'PUT',
        bodyData: payload,
      });

      const data = await res.json();
      if (res.ok) {
        setEditMemberOpen(false);
        await refreshTeam();
        showSuccess('Staff Updated', `Account details for "${editMemberForm.name}" updated successfully.`, undefined, 'Proceed');
      } else {
        showError('Update Failed', data.error || 'Failed to update member.', undefined, 'Proceed');
      }
    } catch (err: any) {
      showError('Network Error', err.message || 'Unable to update member.', undefined, 'Proceed');
    } finally {
      setEditMemberSaving(false);
    }
  };

  // Team: Delete Member
  const handleDeleteMember = (member: any) => {
    if (member.id === currentUser?.id) {
      showError('Action Denied', 'You cannot delete your own account.', undefined, 'Proceed');
      return;
    }

    showConfirm({
      title: 'Delete Staff Member',
      message: `Are you sure you want to remove "${member.name}"? This action cannot be undone.`,
      isDestructive: true,
      proceedText: 'Proceed',
      cancelText: 'Cancel',
      onProceed: async () => {
        try {
          const res = await mobileApiFetch(`/api/users/${member.id}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok) {
            await refreshTeam();
            showSuccess('Member Deleted', `"${member.name}" has been removed from your workspace.`, undefined, 'Proceed');
          } else {
            showError('Delete Failed', data.error || 'Failed to remove member.', undefined, 'Proceed');
          }
        } catch (err: any) {
          showError('Network Error', err.message || 'Unable to delete member.', undefined, 'Proceed');
        }
      },
    });
  };

  // Handle Logout
  const handleLogout = () => {
    showConfirm({
      title: 'Confirm Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      isDestructive: true,
      proceedText: 'Proceed',
      cancelText: 'Cancel',
      onProceed: () => {
        unregisterDeviceToken()
          .catch(err => console.error('[FCM] Error unregistering token:', err))
          .finally(() => {
            dispatch(logoutUser() as any);
          });
      },
    });
  };

  // Filtered team members
  const filteredTeam = useMemo(() => {
    if (!teamSearch.trim()) return teamMembers;
    const q = teamSearch.toLowerCase();
    return teamMembers.filter(m => (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.phone && m.phone.toLowerCase().includes(q)) ||
      (m.role && m.role.toLowerCase().includes(q))
    ));
  }, [teamMembers, teamSearch]);

  // Dynamic responsive paddings
  const dynamicTopPad = Math.max(insets.top, Platform.OS === 'ios' ? 20 : 12) + (isSmallScreen ? 8 : 12);
  const dynamicBottomPad = Math.max(insets.bottom, 20) + (isTablet ? 60 : 40);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: dynamicTopPad }]}>
        <View style={[styles.headerInner, isTablet && styles.maxContainer]}>
          <View style={styles.headerLeft}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={isSmallScreen ? 22 : 24} color="#0f172a" />
              </TouchableOpacity>
            )}
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.headerTitle, isSmallScreen && { fontSize: 18 }]}>Settings</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {currentUser?.companyName || 'Enterprise Workspace'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.refreshIconBtn} 
            onPress={() => { setRefreshing(true); loadData(); }}
            activeOpacity={0.7}
          >
            <RefreshCw size={isSmallScreen ? 16 : 18} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Tab Bar */}
      {!isStaff && (
        <View style={styles.tabBarContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.tabBarScroll, 
              isTablet && styles.tabBarScrollTablet
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabPill, 
                isSmallScreen && styles.tabPillSmall,
                activeTab === 'company' && styles.tabPillActive
              ]}
              onPress={() => setActiveTab('company')}
              activeOpacity={0.8}
            >
              <Building2 size={isSmallScreen ? 14 : 16} color={activeTab === 'company' ? '#2563eb' : '#64748b'} />
              <Text style={[
                styles.tabPillText, 
                isSmallScreen && styles.tabPillTextSmall,
                activeTab === 'company' && styles.tabPillTextActive
              ]}>
                Company Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill, 
                isSmallScreen && styles.tabPillSmall,
                activeTab === 'team' && styles.tabPillActive
              ]}
              onPress={() => setActiveTab('team')}
              activeOpacity={0.8}
            >
              <Users size={isSmallScreen ? 14 : 16} color={activeTab === 'team' ? '#2563eb' : '#64748b'} />
              <Text style={[
                styles.tabPillText, 
                isSmallScreen && styles.tabPillTextSmall,
                activeTab === 'team' && styles.tabPillTextActive
              ]}>
                Team Members
              </Text>
              {teamMembers.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'team' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'team' && styles.tabBadgeTextActive]}>
                    {teamMembers.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill, 
                isSmallScreen && styles.tabPillSmall,
                activeTab === 'profile' && styles.tabPillActive
              ]}
              onPress={() => setActiveTab('profile')}
              activeOpacity={0.8}
            >
              <UserIcon size={isSmallScreen ? 14 : 16} color={activeTab === 'profile' ? '#2563eb' : '#64748b'} />
              <Text style={[
                styles.tabPillText, 
                isSmallScreen && styles.tabPillTextSmall,
                activeTab === 'profile' && styles.tabPillTextActive
              ]}>
                My Profile
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading configurations...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: dynamicBottomPad }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.innerContentWrapper, isTablet && styles.maxContainer]}>
            {/* ============================================================== */}
            {/* TAB 1: COMPANY PROFILE                                         */}
            {/* ============================================================== */}
            {!isStaff && activeTab === 'company' && (
              <View style={styles.tabContent}>
                {/* Branding & Details Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Building2 size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Company Details</Text>
                      <Text style={styles.cardSubtitle}>Edit workspace branding & contact metadata</Text>
                    </View>
                  </View>

                  {/* Company Logo Upload Section */}
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Company Logo</Text>
                    <View style={styles.companyLogoRow}>
                      <View style={styles.companyLogoBox}>
                        {getImageUrl(company.logo || currentUser?.companyLogo) ? (
                          <Image
                            source={{ uri: getImageUrl(company.logo || currentUser?.companyLogo)! }}
                            style={styles.companyLogoImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Building2 size={24} color="#94a3b8" />
                        )}
                      </View>
                      <View style={styles.companyLogoBtnCol}>
                        <TouchableOpacity
                          style={styles.uploadLogoBtn}
                          onPress={() => {
                            setImageUploadTarget('company');
                            setImageUrlInput(company.logo || currentUser?.companyLogo || '');
                            setImageModalOpen(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Upload size={14} color="#2563eb" style={{ marginRight: 6 }} />
                          <Text style={styles.uploadLogoBtnText}>Upload Logo</Text>
                        </TouchableOpacity>
                        {(company.logo || currentUser?.companyLogo) ? (
                          <TouchableOpacity
                            style={styles.removeLogoBtn}
                            onPress={handleRemoveCompanyLogo}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={13} color="#ef4444" style={{ marginRight: 4 }} />
                            <Text style={styles.removeLogoBtnText}>Remove</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Company Name *</Text>
                    <View style={styles.inputBox}>
                      <Building2 size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={company.company_name}
                        onChangeText={(val) => setCompany({ ...company, company_name: val })}
                        placeholder="e.g. Acme Corp"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Website Address</Text>
                    <View style={styles.inputBox}>
                      <Globe size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={company.website}
                        onChangeText={(val) => setCompany({ ...company, website: val })}
                        placeholder="https://example.com"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Notification Email</Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={company.email}
                        onChangeText={(val) => setCompany({ ...company, email: val })}
                        placeholder="leads@company.com"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Office Phone</Text>
                    <View style={styles.inputBox}>
                      <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={company.phone}
                        onChangeText={(val) => setCompany({ ...company, phone: val })}
                        placeholder="+1 (555) 000-0000"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, companySaving && styles.btnDisabled]}
                    onPress={handleCompanySubmit}
                    disabled={companySaving}
                    activeOpacity={0.8}
                  >
                    {companySaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Save Company Settings</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Pipeline Stages Customizer */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#f0fdf4' }]}>
                      <Layers size={18} color="#16a34a" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Pipeline Stages</Text>
                      <Text style={styles.cardSubtitle}>Custom lead tracking statuses for sales funnel</Text>
                    </View>
                  </View>

                  {/* Add new status input */}
                  <View style={styles.adderBox}>
                    <Text style={styles.fieldLabel}>Add New Stage</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={newStatusName}
                        onChangeText={setNewStatusName}
                        placeholder="e.g. In Review, Follow Up"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    {/* Color palette selector */}
                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Badge Color</Text>
                    <View style={styles.colorPaletteRow}>
                      {PRESET_COLORS.map((col) => {
                        const isSelected = selectedColor === col;
                        return (
                          <TouchableOpacity
                            key={col}
                            style={[
                              styles.colorDotBtn,
                              isSmallScreen && styles.colorDotBtnSmall,
                              { backgroundColor: col },
                              isSelected && styles.colorDotBtnSelected,
                            ]}
                            onPress={() => setSelectedColor(col)}
                            activeOpacity={0.8}
                          >
                            {isSelected && <Check size={isSmallScreen ? 12 : 14} color="#ffffff" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      style={[styles.secondaryBtn, addingStatus && styles.btnDisabled, { marginTop: 12 }]}
                      onPress={handleAddStatus}
                      disabled={addingStatus}
                      activeOpacity={0.8}
                    >
                      {addingStatus ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <>
                          <Plus size={16} color="#2563eb" style={{ marginRight: 6 }} />
                          <Text style={styles.secondaryBtnText}>Add Pipeline Stage</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Current Statuses list */}
                  <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 8 }]}>
                    Current Stages ({statuses.length})
                  </Text>
                  <View style={styles.chipWrapper}>
                    {statuses.length === 0 ? (
                      <Text style={styles.emptyNote}>No custom stages configured.</Text>
                    ) : (
                      statuses.map((s) => (
                        <View key={s.id || s.name} style={styles.statusBadge}>
                          <View style={[styles.statusColorCircle, { backgroundColor: s.color || '#2563eb' }]} />
                          <Text style={styles.statusBadgeText}>{s.name}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* Acquisition Sources Customizer */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#fef3c7' }]}>
                      <Tag size={18} color="#d97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Acquisition Sources</Text>
                      <Text style={styles.cardSubtitle}>Channels where new prospective leads enter</Text>
                    </View>
                  </View>

                  <View style={styles.adderBox}>
                    <Text style={styles.fieldLabel}>Add New Source</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={newSourceName}
                        onChangeText={setNewSourceName}
                        placeholder="e.g. Google Ads, Referral"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.secondaryBtn, addingSource && styles.btnDisabled, { marginTop: 12 }]}
                      onPress={handleAddSource}
                      disabled={addingSource}
                      activeOpacity={0.8}
                    >
                      {addingSource ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <>
                          <Plus size={16} color="#2563eb" style={{ marginRight: 6 }} />
                          <Text style={styles.secondaryBtnText}>Add Acquisition Source</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 16, marginBottom: 8 }]}>
                    Current Sources ({sources.length})
                  </Text>
                  <View style={styles.chipWrapper}>
                    {sources.length === 0 ? (
                      <Text style={styles.emptyNote}>No custom sources configured.</Text>
                    ) : (
                      sources.map((src, idx) => (
                        <View key={src.id || idx} style={styles.sourceBadge}>
                          <Tag size={12} color="#64748b" style={{ marginRight: 6 }} />
                          <Text style={styles.sourceBadgeText}>{src.source_name}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* REST API & Integrations Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#eff6ff' }]}>
                      <Key size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>WordPress & Webhook API</Text>
                      <Text style={styles.cardSubtitle}>Sync contact forms and external integrations</Text>
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>REST Bearer Security Token</Text>
                  <View style={styles.apiKeyBox}>
                    <TextInput
                      style={[styles.apiKeyText, isSmallScreen && { fontSize: 11 }]}
                      value={showApiKey ? company.api_key : '••••••••••••••••••••••••••••••••'}
                      editable={false}
                      selectTextOnFocus
                    />
                    <View style={styles.apiKeyActions}>
                      <TouchableOpacity
                        onPress={() => setShowApiKey(!showApiKey)}
                        style={styles.iconMiniBtn}
                        activeOpacity={0.7}
                      >
                        {showApiKey ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleShareKey}
                        style={styles.iconMiniBtn}
                        activeOpacity={0.7}
                      >
                        <Share2 size={16} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* <TouchableOpacity
                    style={[styles.outlineBtn, regeneratingKey && styles.btnDisabled, { marginTop: 10 }]}
                    onPress={handleRegenerateKey}
                    disabled={regeneratingKey}
                    activeOpacity={0.8}
                  >
                    {regeneratingKey ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <RefreshCw size={14} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={[styles.outlineBtnText, { color: '#ef4444' }]}>Regenerate API Key</Text>
                      </>
                    )}
                  </TouchableOpacity> */}

                  <View style={styles.infoCallout}>
                    <Text style={styles.calloutTitle}>API Ingestion Target:</Text>
                    <Text style={styles.calloutMono} selectable>
                      {`${getBaseUrl()}/api/leads/create`}
                    </Text>
                    <Text style={styles.calloutSub}>Method: POST • Auth Header: Authorization: Bearer &lt;KEY&gt;</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 2: TEAM MEMBERS                                            */}
            {/* ============================================================== */}
            {!isStaff && activeTab === 'team' && (
              <View style={styles.tabContent}>
                {/* Top Action Bar */}
                <View style={styles.teamTopBar}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.sectionHeaderTitle}>Workspace Staff</Text>
                    <Text style={styles.sectionHeaderSubtitle}>Manage user accounts and roles</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addMemberTopBtn}
                    onPress={() => setAddMemberOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.addMemberTopBtnText}>Add Staff</Text>
                  </TouchableOpacity>
                </View>

                {/* Search input */}
                <View style={styles.searchBar}>
                  <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search staff by name, email..."
                    placeholderTextColor="#94a3b8"
                    value={teamSearch}
                    onChangeText={setTeamSearch}
                  />
                  {teamSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setTeamSearch('')} activeOpacity={0.7}>
                      <X size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Staff Cards List */}
                {filteredTeam.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Users size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
                    <Text style={styles.emptyCardTitle}>No team members found</Text>
                    <Text style={styles.emptyCardSubtitle}>
                      {teamSearch ? 'Try a different search query' : 'Tap "+ Add Staff" to invite a member.'}
                    </Text>
                  </View>
                ) : (
                  filteredTeam.map((member) => {
                    const isCurrent = member.id === currentUser?.id;
                    const initials = member.name
                      ? member.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'U';

                    return (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberCardHeader}>
                          <View style={[styles.memberAvatar, isSmallScreen && styles.memberAvatarSmall]}>
                            <Text style={styles.memberAvatarText}>{initials}</Text>
                          </View>
                          
                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                              {isCurrent && (
                                <View style={styles.youBadge}>
                                  <Text style={styles.youBadgeText}>YOU</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                          </View>

                          {/* Role pill */}
                          <View
                            style={[
                              styles.rolePill,
                              member.role === 'super_admin'
                                ? styles.roleSuperAdmin
                                : member.role === 'company_admin'
                                ? styles.roleAdmin
                                : styles.roleStaff,
                            ]}
                          >
                            <Shield size={11} color={member.role === 'staff' ? '#475569' : '#2563eb'} style={{ marginRight: 3 }} />
                            <Text
                              style={[
                                styles.rolePillText,
                                member.role === 'staff' ? { color: '#475569' } : { color: '#2563eb' },
                              ]}
                            >
                              {member.role === 'company_admin'
                                ? 'Admin'
                                : member.role === 'super_admin'
                                ? 'Super'
                                : 'Staff'}
                            </Text>
                          </View>
                        </View>

                        {/* Phone & Joined info */}
                        <View style={styles.memberCardDetails}>
                          <View style={styles.memberDetailRow}>
                            <Phone size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                            <Text style={styles.memberDetailText} numberOfLines={1}>
                              {member.phone || 'No phone added'}
                            </Text>
                          </View>
                          <Text style={styles.memberJoinedText}>
                            Joined:{' '}
                            {member.created_at || member.createdAt
                              ? new Date(member.created_at || member.createdAt).toLocaleDateString()
                              : '—'}
                          </Text>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.memberCardActions}>
                          <TouchableOpacity
                            style={[styles.memberEditBtn, isSmallScreen && { flex: 1, justifyContent: 'center' }]}
                            onPress={() => {
                              setSelectedMember(member);
                              setEditMemberForm({
                                name: member.name || '',
                                email: member.email || '',
                                phone: member.phone || '',
                                password: '',
                                role: member.role || 'staff',
                              });
                              setShowEditPassword(false);
                              setEditMemberOpen(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Edit3 size={13} color="#2563eb" style={{ marginRight: 4 }} />
                            <Text style={styles.memberEditBtnText}>Edit Details</Text>
                          </TouchableOpacity>

                          {!isCurrent && (
                            <TouchableOpacity
                              style={[styles.memberDeleteBtn, isSmallScreen && { flex: 1, justifyContent: 'center' }]}
                              onPress={() => handleDeleteMember(member)}
                              activeOpacity={0.7}
                            >
                              <Trash2 size={13} color="#ef4444" style={{ marginRight: 4 }} />
                              <Text style={styles.memberDeleteBtnText}>Delete</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 3: MY PROFILE                                              */}
            {/* ============================================================== */}
            {activeTab === 'profile' && (
              <View style={styles.tabContent}>
                {/* Profile Picture / Logo Image Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Camera size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>Profile Picture / Logo Image</Text>
                      <Text style={styles.cardSubtitle}>Shows in header, drawer, and across the CRM</Text>
                    </View>
                  </View>

                  <View style={styles.avatarRow}>
                    <View style={styles.avatarLarge}>
                      {getImageUrl(profileForm.avatar || currentUser?.companyLogo || currentUser?.avatar) ? (
                        <Image
                          source={{ uri: getImageUrl(profileForm.avatar || currentUser?.companyLogo || currentUser?.avatar)! }}
                          style={styles.avatarLargeImg}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.avatarLargeText}>
                          {profileForm.name ? profileForm.name[0].toUpperCase() : 'U'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.avatarActions}>
                      <TouchableOpacity
                        style={styles.avatarBtn}
                        onPress={() => {
                          setImageUploadTarget('profile');
                          setImageUrlInput(profileForm.avatar || currentUser?.avatar || '');
                          setImageModalOpen(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Upload size={14} color="#2563eb" style={{ marginRight: 6 }} />
                        <Text style={styles.avatarBtnText}>Set / Update Image</Text>
                      </TouchableOpacity>

                      {(profileForm.avatar || currentUser?.avatar) ? (
                        <TouchableOpacity
                          style={styles.avatarRemoveBtn}
                          onPress={() => setProfileForm(prev => ({ ...prev, avatar: '' }))}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={14} color="#ef4444" style={{ marginRight: 6 }} />
                          <Text style={styles.avatarRemoveBtnText}>Remove Image</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.avatarHelpText}>
                    Available for all user roles (Super Admin, Company Admin, and Staff).
                  </Text>
                </View>

                {/* Credentials Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <UserIcon size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>My Profile Credentials</Text>
                      <Text style={styles.cardSubtitle}>Edit your user info & login password</Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Full Name *</Text>
                    <View style={styles.inputBox}>
                      <UserIcon size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={profileForm.name}
                        onChangeText={(val) => setProfileForm({ ...profileForm, name: val })}
                        placeholder="Jane Doe"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Email Login *</Text>
                    <View style={styles.inputBox}>
                      <Mail size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={profileForm.email}
                        onChangeText={(val) => setProfileForm({ ...profileForm, email: val })}
                        placeholder="jane@company.com"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Contact Phone</Text>
                    <View style={styles.inputBox}>
                      <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={profileForm.phone}
                        onChangeText={(val) => setProfileForm({ ...profileForm, phone: val })}
                        placeholder="+1 (555) 000-0000"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Change Password (Optional)</Text>
                    <View style={styles.inputBox}>
                      <Lock size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        value={profileForm.password}
                        onChangeText={(val) => setProfileForm({ ...profileForm, password: val })}
                        placeholder="Leave empty to keep existing"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.inputEndIcon}
                        activeOpacity={0.7}
                      >
                        {showPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, profileSaving && styles.btnDisabled]}
                    onPress={handleProfileSubmit}
                    disabled={profileSaving}
                    activeOpacity={0.8}
                  >
                    {profileSaving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Update Profile</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Notification & Sound Settings Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#f0fdf4' }]}>
                      <Volume2 size={18} color="#16a34a" />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.cardTitle}>Lead Alert Ringtone</Text>
                      <Text style={styles.cardSubtitle}>Instant audible notifications for new leads</Text>
                    </View>
                    <Switch
                      value={soundEnabled}
                      onValueChange={handleToggleSound}
                      trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                      thumbColor={soundEnabled ? '#2563eb' : '#94a3b8'}
                    />
                  </View>
                  <Text style={styles.soundNote}>
                    When active, incoming push notifications for hot and assigned leads play an audible alert tone.
                  </Text>
                </View>

                {/* Account Role & Platform Summary */}
                <View style={styles.card}>
                  <Text style={styles.cardMiniTitle}>Workspace Status</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Assigned Role</Text>
                    <View style={styles.roleBadgeSimple}>
                      <Text style={styles.roleBadgeSimpleText}>
                        {currentUser?.role?.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Workspace Tenant</Text>
                    <Text style={styles.metaValue}>{currentUser?.companyName || 'Enterprise Platform'}</Text>
                  </View>
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD STAFF MEMBER                                        */}
      {/* ============================================================== */}
      <Modal
        visible={addMemberOpen}
        animationType={isTablet ? 'fade' : 'slide'}
        transparent={true}
        onRequestClose={() => setAddMemberOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalBackdrop, isTablet && styles.modalBackdropTablet]}
        >
          <View style={[
            styles.modalCard,
            isTablet && styles.modalCardTablet,
            isLandscape && { maxHeight: '92%' }
          ]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Add Staff Member</Text>
                <Text style={styles.modalSubtitle}>Create new account for team member</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setAddMemberOpen(false)} 
                activeOpacity={0.7}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingVertical: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <View style={styles.inputBox}>
                  <UserIcon size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor="#94a3b8"
                    value={memberForm.name}
                    onChangeText={(val) => setMemberForm({ ...memberForm, name: val })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email Address *</Text>
                <View style={styles.inputBox}>
                  <Mail size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="jane@company.com"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={memberForm.email}
                    onChangeText={(val) => setMemberForm({ ...memberForm, email: val })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={styles.inputBox}>
                  <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={memberForm.phone}
                    onChangeText={(val) => setMemberForm({ ...memberForm, phone: val })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Login Password *</Text>
                <View style={styles.inputBox}>
                  <Lock size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showMemberPassword}
                    value={memberForm.password}
                    onChangeText={(val) => setMemberForm({ ...memberForm, password: val })}
                  />
                  <TouchableOpacity
                    onPress={() => setShowMemberPassword(!showMemberPassword)}
                    style={styles.inputEndIcon}
                    activeOpacity={0.7}
                  >
                    {showMemberPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Access Role</Text>
                <View style={styles.roleSelectRow}>
                  <TouchableOpacity
                    style={[styles.roleSelectBtn, memberForm.role === 'staff' && styles.roleSelectBtnActive]}
                    onPress={() => setMemberForm({ ...memberForm, role: 'staff' })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleSelectBtnText, memberForm.role === 'staff' && styles.roleSelectBtnTextActive]}>
                      Staff (Limited)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleSelectBtn, memberForm.role === 'company_admin' && styles.roleSelectBtnActive]}
                    onPress={() => setMemberForm({ ...memberForm, role: 'company_admin' })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleSelectBtnText, memberForm.role === 'company_admin' && styles.roleSelectBtnTextActive]}>
                      Admin (Full)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddMemberOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, memberSaving && styles.btnDisabled]}
                onPress={handleAddMember}
                disabled={memberSaving}
                activeOpacity={0.8}
              >
                {memberSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Add Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: EDIT STAFF MEMBER                                       */}
      {/* ============================================================== */}
      <Modal
        visible={editMemberOpen}
        animationType={isTablet ? 'fade' : 'slide'}
        transparent={true}
        onRequestClose={() => setEditMemberOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalBackdrop, isTablet && styles.modalBackdropTablet]}
        >
          <View style={[
            styles.modalCard,
            isTablet && styles.modalCardTablet,
            isLandscape && { maxHeight: '92%' }
          ]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Edit Staff Member</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  Member ID #{selectedMember?.id} • {selectedMember?.email}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setEditMemberOpen(false)} 
                activeOpacity={0.7}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingVertical: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <View style={styles.inputBox}>
                  <UserIcon size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full Name"
                    placeholderTextColor="#94a3b8"
                    value={editMemberForm.name}
                    onChangeText={(val) => setEditMemberForm({ ...editMemberForm, name: val })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email Address *</Text>
                <View style={styles.inputBox}>
                  <Mail size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={editMemberForm.email}
                    onChangeText={(val) => setEditMemberForm({ ...editMemberForm, email: val })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={styles.inputBox}>
                  <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Phone"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={editMemberForm.phone}
                    onChangeText={(val) => setEditMemberForm({ ...editMemberForm, phone: val })}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Access Role</Text>
                <View style={styles.roleSelectRow}>
                  <TouchableOpacity
                    style={[styles.roleSelectBtn, editMemberForm.role === 'staff' && styles.roleSelectBtnActive]}
                    onPress={() => setEditMemberForm({ ...editMemberForm, role: 'staff' })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleSelectBtnText, editMemberForm.role === 'staff' && styles.roleSelectBtnTextActive]}>
                      Staff (Limited)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleSelectBtn, editMemberForm.role === 'company_admin' && styles.roleSelectBtnActive]}
                    onPress={() => setEditMemberForm({ ...editMemberForm, role: 'company_admin' })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleSelectBtnText, editMemberForm.role === 'company_admin' && styles.roleSelectBtnTextActive]}>
                      Admin (Full)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>New Password (Optional)</Text>
                <View style={styles.inputBox}>
                  <Lock size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Leave blank to keep current"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showEditPassword}
                    value={editMemberForm.password}
                    onChangeText={(val) => setEditMemberForm({ ...editMemberForm, password: val })}
                  />
                  <TouchableOpacity
                    onPress={() => setShowEditPassword(!showEditPassword)}
                    style={styles.inputEndIcon}
                    activeOpacity={0.7}
                  >
                    {showEditPassword ? <EyeOff size={16} color="#64748b" /> : <Eye size={16} color="#64748b" />}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditMemberOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, editMemberSaving && styles.btnDisabled]}
                onPress={handleEditMember}
                disabled={editMemberSaving}
                activeOpacity={0.8}
              >
                {editMemberSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Image & Logo Update Modal */}
      <Modal
        visible={imageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalOpen(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalBackdrop, isTablet && styles.modalBackdropTablet]}
        >
          <View style={[styles.modalCard, isTablet && styles.modalCardTablet]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {imageUploadTarget === 'company' ? 'Update Company Logo' : 'Update Profile Photo'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {imageUploadTarget === 'company'
                    ? 'Displayed on sidebar brand, app bar, and company documents'
                    : 'Appears on your avatar, profile, and system comments'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn}
                onPress={() => setImageModalOpen(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {uploadingImage ? (
              <View style={{ paddingVertical: 36, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 14, fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                  Uploading local image to server...
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                  Please wait while your image is saved.
                </Text>
              </View>
            ) : (
              <View style={{ marginVertical: 14 }}>
                <Text style={styles.modalSectionLabel}>UPLOAD LOCAL PHOTO</Text>
                
                <View style={styles.uploadOptionsRow}>
                  <TouchableOpacity
                    style={styles.uploadOptionCard}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.uploadOptionIconBox, { backgroundColor: '#eff6ff' }]}>
                      <Upload size={22} color="#2563eb" />
                    </View>
                    <Text style={styles.uploadOptionTitle}>Device Gallery</Text>
                    <Text style={styles.uploadOptionSub}>Pick from photos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadOptionCard}
                    onPress={handleTakePhoto}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.uploadOptionIconBox, { backgroundColor: '#f0fdf4' }]}>
                      <Camera size={22} color="#16a34a" />
                    </View>
                    <Text style={styles.uploadOptionTitle}>Take Photo</Text>
                    <Text style={styles.uploadOptionSub}>Use phone camera</Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.modalDividerRow}>
                  <View style={styles.modalDividerLine} />
                  <Text style={styles.modalDividerText}>OR IMAGE URL</Text>
                  <View style={styles.modalDividerLine} />
                </View>

                {/* Direct URL */}
                <View style={styles.inputBox}>
                  <Globe size={16} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={imageUrlInput}
                    onChangeText={setImageUrlInput}
                    placeholder="https://example.com/logo.png"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                </View>

                {currentUser?.companyLogo && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}
                    onPress={() => setImageUrlInput(currentUser.companyLogo || '')}
                    activeOpacity={0.7}
                  >
                    <Building2 size={14} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '600' }}>
                      Use Active Company Logo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setImageModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={() => {
                  const finalUrl = imageUrlInput.trim();
                  if (imageUploadTarget === 'company') {
                    setCompany(prev => ({ ...prev, logo: finalUrl }));
                    setImageModalOpen(false);

                    const targetCid = company.id || currentUser?.companyId || currentUser?.company_id;
                    mobileApiFetch('/api/settings/company', {
                      method: 'PUT',
                      bodyData: {
                        ...company,
                        logo: finalUrl,
                        company_id: targetCid,
                      },
                    }).then(async res => {
                      if (res.ok) {
                        const token = await AsyncStorage.getItem('token');
                        const updatedUser = { ...currentUser, companyLogo: finalUrl };
                        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                        dispatch(setAuth({ token, user: updatedUser }));
                      }
                    }).catch(console.warn);

                    showSuccess('Logo Attached', 'Company logo updated and saved.', undefined, 'Proceed');
                  } else {
                    setProfileForm(prev => ({ ...prev, avatar: finalUrl }));
                    setImageModalOpen(false);
                    showSuccess('Image Attached', 'Click "Save Profile Changes" to save to your account.', undefined, 'Proceed');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitBtnText}>Apply Image</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingBottom: 14,
    paddingHorizontal: TOKENS.spacing.md,
    ...TOKENS.shadows.sm,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  headerTitle: {
    color: TOKENS.colors.heading,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: TOKENS.radius.sm,
    backgroundColor: TOKENS.colors.primaryLight,
  },

  // Max Container for Tablets / Large Screens
  maxContainer: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  innerContentWrapper: {
    width: '100%',
  },

  // Segmented Tabs
  tabBarContainer: {
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingVertical: 8,
  },
  tabBarScroll: {
    paddingHorizontal: TOKENS.spacing.md,
    gap: 8,
  },
  tabBarScrollTablet: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.background,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  tabPillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tabPillActive: {
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.colors.secondary,
    marginLeft: 6,
  },
  tabPillTextSmall: {
    fontSize: 12,
    marginLeft: 4,
  },
  tabPillTextActive: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: TOKENS.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: TOKENS.colors.primary,
  },
  tabBadgeText: {
    color: TOKENS.colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  tabBadgeTextActive: {
    color: TOKENS.colors.white,
  },

  // Content
  scrollContent: {
    padding: TOKENS.spacing.md,
  },
  tabContent: {
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    color: TOKENS.colors.secondary,
    fontSize: 13,
  },

  // Cards
  card: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 18,
    ...TOKENS.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    color: TOKENS.colors.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 1,
  },
  cardMiniTitle: {
    color: TOKENS.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Forms
  formGroup: {
    marginBottom: 14,
  },
  companyLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  companyLogoBox: {
    width: 58,
    height: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 3,
  },
  companyLogoImage: {
    width: '100%',
    height: '100%',
  },
  companyLogoBtnCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  uploadLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
    borderRadius: TOKENS.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadLogoBtnText: {
    color: TOKENS.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  removeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: TOKENS.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeLogoBtnText: {
    color: TOKENS.colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.heading,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    borderRadius: TOKENS.radius.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: TOKENS.colors.heading,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  inputEndIcon: {
    padding: 6,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.primary,
    borderRadius: TOKENS.radius.md,
    paddingVertical: 12,
    marginTop: 8,
    minHeight: 46,
  },
  primaryBtnText: {
    color: TOKENS.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
    borderRadius: TOKENS.radius.md,
    paddingVertical: 11,
    minHeight: 44,
  },
  secondaryBtnText: {
    color: TOKENS.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 10,
    minHeight: 42,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Adder Box
  adderBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  colorDotBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotBtnSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotBtnSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  chipWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusColorCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceBadgeText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyNote: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },

  // API Key
  apiKeyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  apiKeyText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  apiKeyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconMiniBtn: {
    padding: 6,
  },
  infoCallout: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    marginTop: 14,
  },
  calloutTitle: {
    color: '#1e40af',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calloutMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1d4ed8',
    fontSize: 12,
    marginTop: 3,
  },
  calloutSub: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 4,
  },

  // Team
  teamTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeaderSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  addMemberTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  addMemberTopBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyCardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Member Card
  memberCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 14,
    marginBottom: 10,
    ...TOKENS.shadows.card,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
  },
  memberAvatarText: {
    color: TOKENS.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  memberName: {
    color: TOKENS.colors.heading,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: TOKENS.colors.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  youBadgeText: {
    color: TOKENS.colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  memberEmail: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 1,
    flexShrink: 1,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  roleSuperAdmin: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  roleAdmin: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  roleStaff: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  memberCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 10,
    gap: 8,
  },
  memberDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetailText: {
    color: '#475569',
    fontSize: 12,
    flexShrink: 1,
  },
  memberJoinedText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  memberCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  memberEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  memberEditBtnText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  memberDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  memberDeleteBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },

  // Sound Note
  soundNote: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },

  // Meta Rows
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  metaValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  roleBadgeSimple: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeSimpleText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    minHeight: 48,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdropTablet: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    width: '100%',
  },
  modalCardTablet: {
    maxWidth: 520,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  roleSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleSelectBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  roleSelectBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  roleSelectBtnTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    minHeight: 46,
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#2563eb',
    minHeight: 46,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Avatar / Logo Styles
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarLargeImg: {
    width: '100%',
    height: '100%',
  },
  avatarLargeText: {
    color: '#2563eb',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  avatarBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  avatarRemoveBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarHelpText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },

  // Upload Local Image Modal Styles
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadOptionCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  uploadOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  modalDividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
});
