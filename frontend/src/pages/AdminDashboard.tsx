import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllUsersApi, getAllStaffApi, getAllGuestsApi, createStaffApi, deleteUserApi, updateProfileApi } from '../api/userApi';
import { getAllAdminVillasApi, addVillaApi, updateVillaApi, deleteVillaApi, getAdminVillaByIdApi, uploadVillaImagesApi } from '../api/villaApi';
import { getAllBookingsApi } from '../api/bookingApi';
import { getAllPromotionsApi, createPromotionApi, updatePromotionApi, deletePromotionApi } from '../api/promotionApi';
import type { UserResponse, CreateStaffRequest, UpdateProfileRequest, Villa, VillaRequest, Booking, Promotion, PromotionRequest, MealPlan } from '../types';
import { COUNTRIES } from '../data/countries';
import VillaTable from '../components/VillaTable';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Toast from '../components/Toast';
import AdminReviews from './AdminReviews';
import RevenueDashboard from './RevenueDashboard';
import '../styles/Dashboard.css';
import '../styles/Villa.css';
import '../styles/Booking.css';

type ActiveTab = 'overview' | 'staff' | 'guests' | 'create-staff' | 'profile' | 'villas' | 'add-villa' | 'edit-villa' | 'bookings' | 'revenue' | 'promotions' | 'add-promotion' | 'edit-promotion' | 'reviews';

const emptyVillaForm = (): VillaRequest => ({
  name: '',
  description: '',
  type: 'DELUXE',
  amenities: [],
  imageUrls: [],
  pricing: [],
});

const emptyPromoForm = (): PromotionRequest => ({
  villaId: 0,
  title: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  startDate: '',
  endDate: '',
  isActive: true,
});

const AdminDashboard: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [staff, setStaff] = useState<UserResponse[]>([]);
  const [guests, setGuests] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [guestNationalityFilter, setGuestNationalityFilter] = useState<string>('');

  // Villa state
  const [villas, setVillas] = useState<Villa[]>([]);
  const [villaForm, setVillaForm] = useState<VillaRequest>(emptyVillaForm());
  const [villaErrors, setVillaErrors] = useState<Partial<Record<keyof VillaRequest, string>>>({});
  const [editingVillaId, setEditingVillaId] = useState<number | null>(null);

  const [villaImageFiles, setVillaImageFiles] = useState<File[]>([]);
  const [villaImagePreviews, setVillaImagePreviews] = useState<string[]>([]);
  const [villaImageError, setVillaImageError] = useState<string>('');
  const [villaDragActive, setVillaDragActive] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Bookings filters (admin)
  const [bookingFilterDate, setBookingFilterDate] = useState<string>('');
  const [bookingFilterVillaId, setBookingFilterVillaId] = useState<string>('');

  // Promotions state
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoForm, setPromoForm] = useState<PromotionRequest>(emptyPromoForm());
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [promoErrors, setPromoErrors] = useState<Partial<Record<keyof PromotionRequest, string>>>({});

  // Global delete confirmation modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [deleteModalTitle, setDeleteModalTitle] = useState('Confirm Deletion');
  const [deleteModalMessage, setDeleteModalMessage] = useState(
    'Are you sure you want to delete this item? This action cannot be undone.'
  );
  const [deleteModalShowConfirm, setDeleteModalShowConfirm] = useState(true);
  const [deleteModalShowCancel, setDeleteModalShowCancel] = useState(true);
  const [toast, setToast] = useState('');

  // Create Staff Form
  const [staffForm, setStaffForm] = useState<CreateStaffRequest>({
    firstName: '', lastName: '', email: '', phoneNumber: '', password: '',
  });
  const [staffErrors, setStaffErrors] = useState<Partial<CreateStaffRequest>>({});

  // Profile Update Form
  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    email: user?.email || '', currentPassword: '', newPassword: '',
  });
  const [profileErrors, setProfileErrors] = useState<UpdateProfileRequest>({});

  useEffect(() => {
    loadAllUsers();
    loadVillas();
    loadBookings();
    loadPromotions();
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(''), 3000);
    return () => window.clearTimeout(id);
  }, [message]);

  const filteredGuests = useMemo(() => {
    const f = (guestNationalityFilter || '').trim();
    if (!f) return guests;
    return guests.filter(g => (g.nationality || '').trim() === f);
  }, [guestNationalityFilter, guests]);

  useEffect(() => {
    const urls = villaImageFiles.map(f => URL.createObjectURL(f));
    setVillaImagePreviews(urls);
    return () => {
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [villaImageFiles]);

  const addVillaImageFiles = (files: File[]) => {
    const maxFiles = 5;
    const maxBytes = 5 * 1024 * 1024;
    const nextValid: File[] = [];
    const errors: string[] = [];

    for (const f of files) {
      if (!f) continue;
      const name = (f.name || '').toLowerCase();
      const okExt = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
      const okType = f.type === 'image/jpeg' || f.type === 'image/png';

      if (!okExt && !okType) {
        errors.push('Only JPG, JPEG, or PNG images are allowed.');
        continue;
      }
      if (f.size > maxBytes) {
        errors.push('Each image must be 5MB or less.');
        continue;
      }
      nextValid.push(f);
    }

    setVillaImageFiles(prev => {
      const seen = new Set(prev.map(p => `${p.name}:${p.size}:${p.lastModified}`));
      const merged = [...prev];
      for (const f of nextValid) {
        const key = `${f.name}:${f.size}:${f.lastModified}`;
        if (seen.has(key)) continue;
        merged.push(f);
        seen.add(key);
      }

      if (merged.length > maxFiles) {
        errors.push(`You can only upload up to ${maxFiles} images per villa.`);
        return merged.slice(0, maxFiles);
      }
      return merged;
    });

    setVillaImageError(errors.length ? errors[0] : '');
  };

  const removeVillaImageAt = (index: number) => {
    setVillaImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearVillaImageSelection = () => {
    setVillaImageFiles([]);
    setVillaImageError('');
    setVillaDragActive(false);
  };

  const loadBookings = async () => {
    try {
      const data = await getAllBookingsApi();
      setBookings(data);
    } catch { /* silent */ }
  };

  const parsedBookingFilterDate = useMemo(() => {
    const raw = (bookingFilterDate || '').trim();
    if (!raw) return { iso: null as string | null, error: '' };

    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return { iso: null as string | null, error: 'Use MM/DD/YYYY format.' };

    const mm = Number(m[1]);
    const dd = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
      return { iso: null as string | null, error: 'Invalid date.' };
    }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) {
      return { iso: null as string | null, error: 'Invalid date.' };
    }

    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== (mm - 1) || d.getDate() !== dd) {
      return { iso: null as string | null, error: 'Invalid date.' };
    }

    const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return { iso, error: '' };
  }, [bookingFilterDate]);

  const filteredBookings = useMemo(() => {
    let list = bookings;

    if (bookingFilterVillaId) {
      list = list.filter(b => String(b.villaId) === bookingFilterVillaId);
    }

    if (parsedBookingFilterDate.iso) {
      const iso = parsedBookingFilterDate.iso;
      // Show bookings that cover the given date: checkIn <= date < checkOut
      list = list.filter(b => iso >= b.checkInDate && iso < b.checkOutDate);
    }

    return list;
  }, [bookings, bookingFilterVillaId, parsedBookingFilterDate.iso]);

  const formatAsMMDDYYYY = (raw: string): string => {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const loadPromotions = async () => {
    try { setPromotions(await getAllPromotionsApi()); } catch { /* silent */ }
  };

  const validatePromoForm = (form: PromotionRequest): Partial<Record<keyof PromotionRequest, string>> => {
    const errs: Partial<Record<keyof PromotionRequest, string>> = {};
    if (!form.villaId) errs.villaId = 'Villa is required';
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.discountValue || form.discountValue <= 0) errs.discountValue = 'Discount value must be positive';
    if (form.discountType === 'PERCENTAGE' && form.discountValue > 100) errs.discountValue = 'Percentage cannot exceed 100';
    if (!form.startDate) errs.startDate = 'Start date is required';
    if (!form.endDate) errs.endDate = 'End date is required';
    if (form.startDate && form.endDate && form.endDate <= form.startDate) errs.endDate = 'End date must be after start date';
    return errs;
  };

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePromoForm(promoForm);
    setPromoErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await createPromotionApi(promoForm);
      setMessage('Promotion created successfully!');
      setPromoForm(emptyPromoForm());
      await loadPromotions();
      setActiveTab('promotions');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to create promotion.');
    }
  };

  const handleEditPromotionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromoId) return;
    const errs = validatePromoForm(promoForm);
    setPromoErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await updatePromotionApi(editingPromoId, promoForm);
      setMessage('Promotion updated successfully!');
      setPromoForm(emptyPromoForm());
      setEditingPromoId(null);
      await loadPromotions();
      setActiveTab('promotions');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to update promotion.');
    }
  };

  const handleDeletePromotion = async (id: number) => {
    setSelectedId(id);
    setDeleteType('promotion');
    setDeleteModalTitle('Delete Promotion');
    setDeleteModalMessage('Are you sure you want to delete this promotion? This action cannot be undone.');
    setDeleteModalShowConfirm(true);
    setDeleteModalShowCancel(true);
    setShowModal(true);
  };

  const handleTogglePromotion = async (promo: Promotion) => {
    try {
      await updatePromotionApi(promo.id, {
        villaId: promo.villaId,
        title: promo.title,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        startDate: promo.startDate,
        endDate: promo.endDate,
        isActive: !promo.isActive,
      });
      await loadPromotions();
    } catch { setMessage('Failed to toggle promotion.'); }
  };

  const startEditPromotion = (promo: Promotion) => {
    setEditingPromoId(promo.id);
    setPromoForm({
      villaId: promo.villaId,
      title: promo.title,
      description: promo.description,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      startDate: promo.startDate,
      endDate: promo.endDate,
      isActive: promo.isActive,
    });
    setPromoErrors({});
    setActiveTab('edit-promotion');
  };

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const [u, s, g] = await Promise.all([getAllUsersApi(), getAllStaffApi(), getAllGuestsApi()]);
      setAllUsers(u); setStaff(s); setGuests(g);
    } catch { setMessage('Failed to load users.'); }
    finally { setLoading(false); }
  };

  const loadVillas = async () => {
    try {
      const data = await getAllAdminVillasApi();
      setVillas(data);
    } catch { /* silent */ }
  };

  const validateVillaForm = (): boolean => {
    const errs: Partial<Record<keyof VillaRequest, string>> = {};
    if (!villaForm.name.trim()) errs.name = 'Villa name is required';
    if (!villaForm.description.toString().trim()) errs.description = 'Description is required';

    const existing = (villaForm.imageUrls ?? []).filter(u => u.trim() !== '');
    const effectiveCount = villaImageFiles.length > 0 ? villaImageFiles.length : existing.length;
    if (effectiveCount === 0) errs.imageUrls = 'At least one image is required';
    if (effectiveCount > 5) errs.imageUrls = 'You can only upload up to 5 images';

    // Pricing matrix validation
    const mealPlans: MealPlan[] = ['ROOM_ONLY', 'BED_AND_BREAKFAST', 'HALF_BOARD', 'FULL_BOARD'];
    const allowedGuests = villaForm.type === 'DELUXE'
      ? [2, 3]
      : [2, 3, 4, 5, 6];

    const key = (g: number, m: MealPlan) => `${g}:${m}`;
    const map = new Map<string, number>();
    for (const row of (villaForm.pricing ?? [])) {
      const price = Number(row.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      map.set(key(row.guestCount, row.mealPlan), price);
    }

    const missing: string[] = [];
    for (const g of allowedGuests) {
      for (const m of mealPlans) {
        if (!map.has(key(g, m))) missing.push(`${g} - ${m.replaceAll('_', ' ')}`);
      }
    }
    if (missing.length > 0) {
      errs.pricing = `Pricing is incomplete. Missing: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`;
    }

    // Strict increasing validation (only when matrix is complete)
    if (!errs.pricing) {
      const mealPlanLabel = (m: MealPlan) => m.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const get = (g: number, m: MealPlan) => map.get(key(g, m)) ?? 0;

      // Increasing guests for same meal plan
      for (const m of mealPlans) {
        for (let i = 1; i < allowedGuests.length; i++) {
          const prevG = allowedGuests[i - 1];
          const nextG = allowedGuests[i];
          const prev = get(prevG, m);
          const next = get(nextG, m);
          if (next <= prev) {
            errs.pricing = `${mealPlanLabel(m)} | ${nextG} guests must be greater than ${mealPlanLabel(m)} | ${prevG} guests.`;
            break;
          }
        }
        if (errs.pricing) break;
      }

      // Increasing meal plan for same guest count
      if (!errs.pricing) {
        for (const g of allowedGuests) {
          for (let i = 1; i < mealPlans.length; i++) {
            const prevM = mealPlans[i - 1];
            const nextM = mealPlans[i];
            const prev = get(g, prevM);
            const next = get(g, nextM);
            if (next <= prev) {
              errs.pricing = `${mealPlanLabel(nextM)} | ${g} guests must be greater than ${mealPlanLabel(prevM)} | ${g} guests.`;
              break;
            }
          }
          if (errs.pricing) break;
        }
      }
    }

    setVillaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildVillaPayload = (imageUrlsOverride?: string[]): VillaRequest => ({
    ...villaForm,
    amenities: (villaForm.amenities as string[]).filter(Boolean),
    imageUrls: (imageUrlsOverride ?? villaForm.imageUrls).filter(u => u.trim() !== ''),
    pricing: (villaForm.pricing ?? []).map(p => ({
      guestCount: Number(p.guestCount),
      mealPlan: p.mealPlan,
      price: Number(p.price),
    })),
  });

  const resolveVillaImageUrls = async (): Promise<string[]> => {
    if (villaImageFiles.length > 0) {
      return uploadVillaImagesApi(villaImageFiles);
    }
    return (villaForm.imageUrls ?? []).filter(u => u.trim() !== '');
  };

  const handleAddVilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateVillaForm()) return;
    try {
      const imageUrls = await resolveVillaImageUrls();
      await addVillaApi(buildVillaPayload(imageUrls));
      setMessage('Villa added successfully!');
      setVillaForm(emptyVillaForm());
      clearVillaImageSelection();
      await loadVillas();
      setActiveTab('villas');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to add villa.');
    }
  };

  const handleEditVillaSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVillaId || !validateVillaForm()) return;
    try {
      const imageUrls = await resolveVillaImageUrls();
      await updateVillaApi(editingVillaId, buildVillaPayload(imageUrls));
      setMessage('Villa updated successfully!');
      setVillaForm(emptyVillaForm());
      clearVillaImageSelection();
      setEditingVillaId(null);
      await loadVillas();
      setActiveTab('villas');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to update villa.');
    }
  };

  const handleDeleteVilla = async (id: number) => {
    setSelectedId(id);
    setDeleteType('villa');
    setDeleteModalTitle('Delete Villa');
    setDeleteModalMessage('Deleting this villa will permanently remove ALL data related to this villa (bookings, payments, promotions, pricing, reviews, etc.). This action cannot be undone.');
    setDeleteModalShowConfirm(true);
    setDeleteModalShowCancel(true);
    setShowModal(true);
  };

  const startEditVilla = async (villa: Villa) => {
    setEditingVillaId(villa.id);
    clearVillaImageSelection();
    try {
      const data = await getAdminVillaByIdApi(villa.id);
      setVillaForm({
        name: data.villa.name,
        description: data.villa.description,
        type: (data.villa.type ?? 'DELUXE'),
        amenities: data.villa.amenities ?? [],
        imageUrls: (data.villa.imageUrls ?? []),
        pricing: (data.pricing ?? []).map(r => ({
          guestCount: r.guestCount,
          mealPlan: r.mealPlan,
          price: r.price,
        })),
      });
      setVillaErrors({});
      setActiveTab('edit-villa');
    } catch {
      setMessage('Failed to load villa pricing for editing.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    setSelectedId(id);
    setDeleteType('user');
    setDeleteModalTitle('Delete User');
    setDeleteModalMessage('Are you sure you want to delete this user? This action cannot be undone.');
    setDeleteModalShowConfirm(true);
    setDeleteModalShowCancel(true);
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedId || !deleteType) return;
    setDeleteProcessing(true);
    try {
      if (deleteType === 'villa') {
        await deleteVillaApi(selectedId);
        await loadVillas();
      } else if (deleteType === 'promotion') {
        await deletePromotionApi(selectedId);
        await loadPromotions();
      } else if (deleteType === 'user') {
        await deleteUserApi(selectedId);
        await loadAllUsers();
      }

      setShowModal(false);
      setSelectedId(null);
      setDeleteType('');
      setDeleteModalTitle('Confirm Deletion');
      setDeleteModalMessage('Are you sure you want to delete this item? This action cannot be undone.');
      setDeleteModalShowConfirm(true);
      setDeleteModalShowCancel(true);
      setToast('Deleted successfully');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to delete item.');
    } finally {
      setDeleteProcessing(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<CreateStaffRequest> = {};
    if (!staffForm.firstName) errs.firstName = 'Required';
    if (!staffForm.lastName) errs.lastName = 'Required';
    if (!staffForm.email) errs.email = 'Required';
    else if (!/\S+@\S+\.\S+/.test(staffForm.email)) errs.email = 'Invalid email';
    if (!staffForm.phoneNumber) errs.phoneNumber = 'Required';
    else if (!/^\+?[0-9]{8,15}$/.test(staffForm.phoneNumber)) errs.phoneNumber = 'Invalid phone';
    if (!staffForm.password) errs.password = 'Required';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/.test(staffForm.password)) errs.password = 'Weak password';
    setStaffErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await createStaffApi(staffForm);
      setMessage('Staff account created successfully!');
      setStaffForm({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' });
      loadAllUsers();
      setActiveTab('staff');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Failed to create staff.');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const errs: UpdateProfileRequest = {};
    if (profileForm.email && !/\S+@\S+\.\S+/.test(profileForm.email)) errs.email = 'Invalid email';
    if (profileForm.newPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/.test(profileForm.newPassword)) errs.newPassword = 'Weak password';
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const updated = await updateProfileApi(user.userId, {
        email: profileForm.email || undefined,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined,
      });
      setMessage('Profile updated! Please login again if you changed your email/password.');
      login({ ...user, email: updated.email });
      setProfileForm(p => ({ ...p, currentPassword: '', newPassword: '' }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage(e.response?.data?.message || 'Update failed.');
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🌊</span>
          <div>
            <p className="sidebar-name">{user?.firstName} {user?.lastName}</p>
            <span className="role-badge badge-admin">ADMIN</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {([
            { key: 'overview', icon: '📊', label: 'Overview' },
            { key: 'bookings', icon: '📅', label: 'Manage Bookings' },
            { key: 'villas', icon: '🏖️', label: 'Manage Villas' },
            { key: 'promotions', icon: '🎁', label: 'Manage Promotions' },
            { key: 'staff', icon: '👥', label: 'Staff Members' },
            { key: 'guests', icon: '🧳', label: 'Guests' },
            { key: 'create-staff', icon: '➕', label: 'Create Staff' },
            { key: 'reviews', icon: '⭐', label: 'Review Management' },
            { key: 'revenue', icon: '💰', label: 'Revenue Analytics' },
            { key: 'profile', icon: '⚙️', label: 'My Profile' },
          ] as { key: ActiveTab; icon: string; label: string }[]).map(item => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.key); setMessage(''); }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <button className="btn-logout-sidebar" onClick={handleLogout}>🚪 Logout</button>
      </aside>

      <main className="dashboard-main">
        <Toast message={toast} onClose={() => setToast('')} />
        <ConfirmDeleteModal
          isOpen={showModal}
          onClose={() => {
            if (deleteProcessing) return;
            setShowModal(false);
            setDeleteModalTitle('Confirm Deletion');
            setDeleteModalMessage('Are you sure you want to delete this item? This action cannot be undone.');
            setDeleteModalShowConfirm(true);
            setDeleteModalShowCancel(true);
          }}
          onConfirm={handleConfirmDelete}
          isProcessing={deleteProcessing}
          title={deleteModalTitle}
          message={deleteModalMessage}
          showConfirmButton={deleteModalShowConfirm}
          showCancelButton={deleteModalShowCancel}
          cancelText={deleteModalShowConfirm ? 'Cancel' : 'OK'}
        />

        {message && (
          <div className={`alert ${message.includes('success') || message.includes('created') || message.includes('updated') || message.includes('deleted') ? 'alert-success' : 'alert-error'}`}>
            {message}
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <h2 className="tab-title">Dashboard Overview</h2>
            <div className="stats-grid">
              <div className="stat-card"><span className="stat-icon">👥</span><h3>{allUsers.length}</h3><p>Total Users</p></div>
              <div className="stat-card"><span className="stat-icon">🧑‍💼</span><h3>{staff.length}</h3><p>Staff Members</p></div>
              <div className="stat-card"><span className="stat-icon">🧳</span><h3>{guests.length}</h3><p>Guests</p></div>
              <div className="stat-card"><span className="stat-icon">🏨</span><h3>{villas.length}</h3><p>Villas Available</p></div>
              <div className="stat-card"><span className="stat-icon">📅</span><h3>{bookings.length}</h3><p>Total Bookings</p></div>
              <div className="stat-card"><span className="stat-icon">✅</span><h3>{bookings.filter(b => b.status === 'CONFIRMED').length}</h3><p>Confirmed</p></div>
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="tab-content">
            <h2 className="tab-title">Manage Bookings</h2>
            <div className="booking-filters">
              <div className="form-group" style={{ maxWidth: 260 }}>
                <label>Filter by Date</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  value={bookingFilterDate}
                  onChange={e => setBookingFilterDate(formatAsMMDDYYYY(e.target.value))}
                />
                {parsedBookingFilterDate.error && (
                  <div className="booking-filter-error">{parsedBookingFilterDate.error}</div>
                )}
              </div>

              <div className="form-group" style={{ maxWidth: 320 }}>
                <label>Filter by Villa</label>
                <select value={bookingFilterVillaId} onChange={e => setBookingFilterVillaId(e.target.value)}>
                  <option value="">All Villas</option>
                  {villas
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(v => (
                      <option key={v.id} value={String(v.id)}>{v.name}</option>
                    ))}
                </select>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <p className="empty-state">No bookings found.</p>
            ) : (
              <div className="table-wrapper bookings-table-wrapper">
                <table className="data-table bookings-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Guest</th>
                      <th>Villa</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Total (LKR)</th>
                      <th>Paid (LKR)</th>
                      <th>Booking Status</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>
                          <div className="guest-cell">
                            <span>{b.guestName}</span>
                            <small>{b.guestEmail}</small>
                          </div>
                        </td>
                        <td>{b.villaName}</td>
                        <td>{b.checkInDate}</td>
                        <td>{b.checkOutDate}</td>
                        <td>{b.totalPrice.toLocaleString()}</td>
                        <td className="paid-amount">{b.amountPaid.toLocaleString()}</td>
                        <td>
                          <span className={`badge-status status-${b.status.toLowerCase()}`}>{b.status}</span>
                        </td>
                        <td>
                          <span className={`badge-payment payment-${b.paymentStatus.toLowerCase().replace('_', '-')}`}>
                            {b.paymentStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STAFF */}
        {activeTab === 'staff' && (
          <div className="tab-content">
            <h2 className="tab-title">Staff Members</h2>
            {loading ? <p>Loading...</p> : <UserTable users={staff} onDelete={handleDeleteUser} showNationality={false} />}
          </div>
        )}

        {/* GUESTS */}
        {activeTab === 'guests' && (
          <div className="tab-content">
            <h2 className="tab-title">Registered Guests</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="form-group" style={{ maxWidth: 320 }}>
                  <label>Filter by Nationality</label>
                  <select value={guestNationalityFilter} onChange={e => setGuestNationalityFilter(e.target.value)}>
                    <option value="">All</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <UserTable users={filteredGuests} showRole={false} showActions={false} />
              </>
            )}
          </div>
        )}

        {/* VILLAS */}
        {activeTab === 'villas' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="tab-title">Manage Villas</h2>
              <button className="btn-primary-action" onClick={() => { setVillaForm(emptyVillaForm()); clearVillaImageSelection(); setVillaErrors({}); setActiveTab('add-villa'); }}>
                ➕ Add New Villa
              </button>
            </div>
            <VillaTable villas={villas} onEdit={startEditVilla} onDelete={handleDeleteVilla} />
          </div>
        )}

        {/* ADD VILLA */}
        {activeTab === 'add-villa' && (
          <div className="tab-content">
            <h2 className="tab-title">Add New Villa</h2>
            <div className="form-card form-card--wide">
              <form onSubmit={handleAddVilla} noValidate>
                <VillaFormFields
                  form={villaForm}
                  setForm={setVillaForm}
                  errors={villaErrors}
                  imageFiles={villaImageFiles}
                  imagePreviews={villaImagePreviews}
                  imageError={villaImageError}
                  dragActive={villaDragActive}
                  setDragActive={setVillaDragActive}
                  onAddFiles={addVillaImageFiles}
                  onRemoveFile={removeVillaImageAt}
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Add Villa</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }}
                    onClick={() => { clearVillaImageSelection(); setActiveTab('villas'); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT VILLA */}
        {activeTab === 'edit-villa' && (
          <div className="tab-content">
            <h2 className="tab-title">Edit Villa</h2>
            <div className="form-card form-card--wide">
              <form onSubmit={handleEditVillaSave} noValidate>
                <VillaFormFields
                  form={villaForm}
                  setForm={setVillaForm}
                  errors={villaErrors}
                  imageFiles={villaImageFiles}
                  imagePreviews={villaImagePreviews}
                  imageError={villaImageError}
                  dragActive={villaDragActive}
                  setDragActive={setVillaDragActive}
                  onAddFiles={addVillaImageFiles}
                  onRemoveFile={removeVillaImageAt}
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Update Villa</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }}
                    onClick={() => { clearVillaImageSelection(); setActiveTab('villas'); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE STAFF */}
        {activeTab === 'create-staff' && (
          <div className="tab-content">
            <h2 className="tab-title">Create Staff Account</h2>
            <div className="form-card">
              <form onSubmit={handleCreateStaff} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input value={staffForm.firstName} onChange={e => setStaffForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First Name" className={staffErrors.firstName ? 'input-error' : ''} />
                    {staffErrors.firstName && <span className="field-error">{staffErrors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input value={staffForm.lastName} onChange={e => setStaffForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last Name" className={staffErrors.lastName ? 'input-error' : ''} />
                    {staffErrors.lastName && <span className="field-error">{staffErrors.lastName}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@holidayvilla.com" className={staffErrors.email ? 'input-error' : ''} />
                  {staffErrors.email && <span className="field-error">{staffErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input value={staffForm.phoneNumber} onChange={e => setStaffForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+94771234567" className={staffErrors.phoneNumber ? 'input-error' : ''} />
                  {staffErrors.phoneNumber && <span className="field-error">{staffErrors.phoneNumber}</span>}
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={staffForm.password} onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))} placeholder="Strong password" className={staffErrors.password ? 'input-error' : ''} />
                  {staffErrors.password && <span className="field-error">{staffErrors.password}</span>}
                </div>
                <button type="submit" className="btn-primary-action">Create Staff Account</button>
              </form>
            </div>
          </div>
        )}

        {/* PROMOTIONS */}
        {activeTab === 'promotions' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="tab-title">Manage Promotions</h2>
              <button className="btn-primary-action" onClick={() => { setPromoForm(emptyPromoForm()); setPromoErrors({}); setActiveTab('add-promotion'); }}>
                ➕ Add Promotion
              </button>
            </div>
            {promotions.length === 0 ? (
              <p className="empty-state">No promotions found. Create one to get started.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Villa</th><th>Title</th><th>Discount</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map(p => (
                      <tr key={p.id}>
                        <td>{p.villaName}</td>
                        <td>
                          <div><strong>{p.title}</strong></div>
                          <small style={{ color: '#888' }}>{p.description}</small>
                        </td>
                        <td>
                          <span className="badge badge-advance">
                            {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `LKR ${p.discountValue.toLocaleString()}`} OFF
                          </span>
                        </td>
                        <td>{p.startDate}</td>
                        <td>{p.endDate}</td>
                        <td>
                          <button
                            className={`badge-status ${p.isActive ? 'status-confirmed' : 'status-cancelled'}`}
                            style={{ cursor: 'pointer', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}
                            onClick={() => handleTogglePromotion(p)}
                            title="Click to toggle active/inactive"
                          >
                            {p.isActive ? '✅ Active' : '⏸ Inactive'}
                          </button>
                        </td>
                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-primary-action" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => startEditPromotion(p)}>Edit</button>
                          <button className="btn-delete" onClick={() => handleDeletePromotion(p.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADD PROMOTION */}
        {activeTab === 'add-promotion' && (
          <div className="tab-content">
            <h2 className="tab-title">Add New Promotion</h2>
            <div className="form-card">
              <form onSubmit={handleAddPromotion} noValidate>
                <PromotionFormFields form={promoForm} setForm={setPromoForm} errors={promoErrors} villas={villas} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Create Promotion</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }} onClick={() => setActiveTab('promotions')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT PROMOTION */}
        {activeTab === 'edit-promotion' && (
          <div className="tab-content">
            <h2 className="tab-title">Edit Promotion</h2>
            <div className="form-card">
              <form onSubmit={handleEditPromotionSave} noValidate>
                <PromotionFormFields form={promoForm} setForm={setPromoForm} errors={promoErrors} villas={villas} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary-action">Update Promotion</button>
                  <button type="button" className="btn-primary-action" style={{ background: '#888' }} onClick={() => setActiveTab('promotions')}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REVIEW MANAGEMENT */}
        {activeTab === 'reviews' && (
          <AdminReviews />
        )}

        {/* REVENUE ANALYTICS */}
        {activeTab === 'revenue' && (
          <RevenueDashboard />
        )}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2 className="tab-title">My Profile Settings</h2>
            <div className="form-card">
              <div className="profile-info">
                <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> <span className="role-badge badge-admin">ADMIN</span></p>
              </div>
              <hr />
              <h3>Update Email / Password</h3>
              <form onSubmit={handleProfileUpdate} noValidate>
                <div className="form-group">
                  <label>New Email</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} placeholder="New email address" className={profileErrors.email ? 'input-error' : ''} />
                  {profileErrors.email && <span className="field-error">{profileErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={profileForm.currentPassword} onChange={e => setProfileForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Required if changing password" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={profileForm.newPassword} onChange={e => setProfileForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="New password" className={profileErrors.newPassword ? 'input-error' : ''} />
                  {profileErrors.newPassword && <span className="field-error">{profileErrors.newPassword}</span>}
                </div>
                <button type="submit" className="btn-primary-action">Update Profile</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const VillaFormFields: React.FC<{
  form: VillaRequest;
  setForm: React.Dispatch<React.SetStateAction<VillaRequest>>;
  errors: Partial<Record<keyof VillaRequest, string>>;
  imageFiles: File[];
  imagePreviews: string[];
  imageError: string;
  dragActive: boolean;
  setDragActive: React.Dispatch<React.SetStateAction<boolean>>;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}> = ({ form, setForm, errors, imageFiles, imagePreviews, imageError, dragActive, setDragActive, onAddFiles, onRemoveFile }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFiles = () => fileInputRef.current?.click();

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAddFiles(files);
    // allow selecting the same file again
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) onAddFiles(files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const existingUrls = (form.imageUrls ?? []).filter(u => u?.trim());
  const mealPlans: { value: MealPlan; label: string }[] = [
    { value: 'ROOM_ONLY', label: 'Room Only' },
    { value: 'BED_AND_BREAKFAST', label: 'Bed & Breakfast' },
    { value: 'HALF_BOARD', label: 'Half Board' },
    { value: 'FULL_BOARD', label: 'Full Board' },
  ];

  const allowedGuests = form.type === 'DELUXE'
    ? [2, 3]
    : [2, 3, 4, 5, 6];

  const getPrice = (guestCount: number, mealPlan: MealPlan): string => {
    const row = (form.pricing ?? []).find(p => p.guestCount === guestCount && p.mealPlan === mealPlan);
    if (!row) return '';
    const v = row.price;
    return v === 0 ? '' : String(v ?? '');
  };

  const setPrice = (guestCount: number, mealPlan: MealPlan, price: string) => {
    setForm(prev => {
      const next = [...(prev.pricing ?? [])];
      const idx = next.findIndex(p => p.guestCount === guestCount && p.mealPlan === mealPlan);
      const parsed = price === '' ? '' : Number(price);
      const row = { guestCount, mealPlan, price: parsed };
      if (idx >= 0) next[idx] = row;
      else next.push(row);
      return { ...prev, pricing: next };
    });
  };

  const digitsOnly = (v: string) => v.replace(/\D/g, '');

  const onTypeChange = (nextType: VillaRequest['type']) => {
    // Reset pricing entries to match the required matrix for selected type
    const nextAllowed = nextType === 'DELUXE' ? [2, 3] : [2, 3, 4, 5, 6];
    setForm(prev => {
      const keep = (prev.pricing ?? []).filter(p => nextAllowed.includes(p.guestCount));
      return { ...prev, type: nextType, pricing: keep };
    });
  };

  return (
    <div className="villa-form-grid">
      <div className="form-group">
        <label>Villa Name *</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Ocean Breeze Villa" className={errors.name ? 'input-error' : ''} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label>Type *</label>
        <select value={form.type} onChange={e => onTypeChange(e.target.value as VillaRequest['type'])}>
          <option value="DELUXE">DELUXE (2–3 guests)</option>
          <option value="SUPERIOR">SUPERIOR (2–6 guests)</option>
        </select>
      </div>

      <div className="form-group villa-form-full">
        <label>Description *</label>
        <textarea rows={4} value={form.description as string}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Full villa description…" className={errors.description ? 'input-error' : ''}
          style={{ resize: 'vertical' }} />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </div>

      <div className="form-group villa-form-full">
        <label>Amenities (comma separated)</label>
        <input value={(form.amenities as string[]).join(', ')}
          onChange={e => setForm(p => ({ ...p, amenities: e.target.value.split(',').map(s => s.trim()) }))}
          placeholder="e.g. Pool, WiFi, Air Conditioning" />
      </div>

      <div className="form-group villa-form-full">
        <label>Pricing (required) *</label>
        {errors.pricing && <span className="field-error">{errors.pricing}</span>}

        <div className="table-wrapper" style={{ marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Guests</th>
                {mealPlans.map(mp => <th key={mp.value}>{mp.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {allowedGuests.map(g => (
                <tr key={g}>
                  <td><strong>{g}</strong></td>
                  {mealPlans.map(mp => (
                    <td key={mp.value}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={getPrice(g, mp.value)}
                        onKeyDown={e => {
                          // Allow: digits, navigation, delete/backspace, tab, and common shortcuts.
                          if (e.ctrlKey || e.metaKey) return;
                          const allowed = [
                            'Backspace', 'Delete', 'Tab',
                            'ArrowLeft', 'ArrowRight', 'Home', 'End'
                          ];
                          if (allowed.includes(e.key)) return;
                          if (/^[0-9]$/.test(e.key)) return;
                          e.preventDefault();
                        }}
                        onPaste={e => {
                          e.preventDefault();
                          const text = e.clipboardData.getData('text');
                          setPrice(g, mp.value, digitsOnly(text));
                        }}
                        onChange={e => {
                          const next = digitsOnly(e.target.value);
                          setPrice(g, mp.value, next);
                        }}
                        placeholder="LKR"
                        style={{ width: '100%', minWidth: 84 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-group villa-form-full">
        <label>Images *</label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          multiple
          onChange={onFileInputChange}
          style={{ display: 'none' }}
        />

        <div
          className={`villa-upload-dropzone ${dragActive ? 'drag-active' : ''}`}
          onClick={onPickFiles}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') onPickFiles();
          }}
        >
          Drag & drop images here or click to upload
        </div>

        {(errors.imageUrls || imageError) && (
          <span className="field-error">{errors.imageUrls || imageError}</span>
        )}

        {imagePreviews.length > 0 ? (
          <div className="villa-upload-previews">
            {imagePreviews.map((src, i) => (
              <div className="villa-upload-thumb" key={`${src}-${i}`}>
                <img src={src} alt={`Selected ${i + 1}`} />
                <button
                  type="button"
                  className="villa-upload-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(i);
                  }}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : existingUrls.length > 0 ? (
          <div className="villa-upload-previews">
            {existingUrls.map((src, i) => (
              <div className="villa-upload-thumb" key={`${src}-${i}`}>
                <img src={src} alt={`Current ${i + 1}`} />
              </div>
            ))}
          </div>
        ) : null}

        {imageFiles.length > 0 && (
          <div className="villa-upload-meta">{imageFiles.length} file(s) selected</div>
        )}
      </div>
    </div>
  );
};

const PromotionFormFields: React.FC<{
  form: PromotionRequest;
  setForm: React.Dispatch<React.SetStateAction<PromotionRequest>>;
  errors: Partial<Record<keyof PromotionRequest, string>>;
  villas: Villa[];
}> = ({ form, setForm, errors, villas }) => (
  <div className="villa-form-grid">
    <div className="form-group">
      <label>Villa *</label>
      <select value={form.villaId} onChange={e => setForm(p => ({ ...p, villaId: Number(e.target.value) }))}
        className={errors.villaId ? 'input-error' : ''}>
        <option value={0}>-- Select Villa --</option>
        {villas.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      {errors.villaId && <span className="field-error">{errors.villaId}</span>}
    </div>
    <div className="form-group">
      <label>Title *</label>
      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        placeholder="e.g. Summer Special" className={errors.title ? 'input-error' : ''} />
      {errors.title && <span className="field-error">{errors.title}</span>}
    </div>
    <div className="form-group villa-form-full">
      <label>Description *</label>
      <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        placeholder="Describe the promotion…" className={errors.description ? 'input-error' : ''}
        style={{ resize: 'vertical' }} />
      {errors.description && <span className="field-error">{errors.description}</span>}
    </div>
    <div className="form-group">
      <label>Discount Type *</label>
      <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' }))}>
        <option value="PERCENTAGE">Percentage (%)</option>
        <option value="FIXED_AMOUNT">Fixed Amount (LKR)</option>
      </select>
    </div>
    <div className="form-group">
      <label>Discount Value * {form.discountType === 'PERCENTAGE' ? '(%)' : '(LKR)'}</label>
      <input type="number" min={0.01} step={0.01} value={form.discountValue || ''}
        onChange={e => setForm(p => ({ ...p, discountValue: Number(e.target.value) }))}
        placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 10000'}
        className={errors.discountValue ? 'input-error' : ''} />
      {errors.discountValue && <span className="field-error">{errors.discountValue}</span>}
    </div>
    <div className="form-group">
      <label>Start Date *</label>
      <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
        className={errors.startDate ? 'input-error' : ''} />
      {errors.startDate && <span className="field-error">{errors.startDate}</span>}
    </div>
    <div className="form-group">
      <label>End Date *</label>
      <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
        className={errors.endDate ? 'input-error' : ''} />
      {errors.endDate && <span className="field-error">{errors.endDate}</span>}
    </div>
    <div className="form-group">
      <label>Status</label>
      <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
    </div>
  </div>
);

const UserTable: React.FC<{
  users: UserResponse[];
  onDelete?: (id: number) => void;
  showRole?: boolean;
  showActions?: boolean;
  showNationality?: boolean;
}> = ({ users, onDelete, showRole = true, showActions = true, showNationality = true }) => (
  <div className="table-wrapper">
    {users.length === 0 ? (
      <p className="empty-state">No records found.</p>
    ) : (
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th>{showNationality && <th>Nationality</th>}
            {showRole && <th>Role</th>}
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{u.phoneNumber}</td>
              {showNationality && <td>{u.nationality}</td>}
              {showRole && <td><span className={`role-badge badge-${u.role.toLowerCase()}`}>{u.role}</span></td>}
              {showActions && (
                <td>
                  <button className="btn-delete" onClick={() => onDelete?.(u.id)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default AdminDashboard;
