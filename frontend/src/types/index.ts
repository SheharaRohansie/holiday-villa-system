export type UserRole = 'ADMIN' | 'STAFF' | 'GUEST';

export interface AuthResponse {
  token: string;
  role: UserRole;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  nic?: string;
  passportNumber?: string;
  password: string;
  confirmPassword: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  nic?: string;
  passportNumber?: string;
  password: string;
}

export interface UpdateProfileRequest {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  nic?: string;
  passportNumber?: string;
  role: UserRole;
  createdAt: string;
}

// ---- Villa Types ----
export interface VillaRequest {
  name: string;
  description: string;
  pricePerNight: number | string;
  maxGuests: number | string;
  amenities: string[];
  imageUrls: string[];
}

export interface Villa {
  id: number;
  name: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: AuthResponse | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// ---- Booking Types ----
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';

export interface BookingRequest {
  villaId: number;
  checkInDate: string;   // ISO date "YYYY-MM-DD"
  checkOutDate: string;
  // Promotion
  appliedPromotionId?: number | null;
  promotionAccepted?: boolean;
}

export interface PaymentRequest {
  paymentType: 'ADVANCE' | 'FULL';
}

export interface Booking {
  id: number;
  userId: number;
  guestName: string;
  guestEmail: string;
  villaId: number;
  villaName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  pricePerNight: number;
  totalPrice: number;
  amountPaid: number;
  remainingAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  // Promotion
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  appliedPromotionId?: number;
  appliedPromotionTitle?: string;
  promotionAccepted?: boolean;
}

// ---- Payment Types ----
export type PaymentType = 'ADVANCE' | 'FULL' | 'REMAINING';
export type PaymentMethod = 'CARD' | 'CASH' | 'BANK_TRANSFER';
export type PaymentTransactionStatus = 'SUCCESS' | 'FAILED';

export interface PaymentProcessRequest {
  bookingId: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
}

export interface PaymentRecord {
  id: number;
  bookingId: number;
  userId: number;
  guestName: string;
  guestEmail: string;
  villaName: string;
  checkInDate: string;
  checkOutDate: string;
  amount: number;
  totalPrice: number;
  amountPaid: number;
  remainingAmount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentTransactionStatus;
  transactionReference: string;
  paymentDate: string;
  bookingStatus: BookingStatus;
  bookingPaymentStatus: PaymentStatus;
}

// ---- Promotion Types ----
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Promotion {
  id: number;
  villaId: number;
  villaName: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface PromotionRequest {
  villaId: number;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ApplicablePromotion {
  promotionId: number;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  endDate: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

// ---- Analytics Types ----
export interface MonthlyRevenue {
  year: number;
  month: number;
  monthLabel: string;
  revenue: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  totalAdvancePayments: number;
  totalRemainingPayments: number;
  totalFullPayments: number;
  totalBookings: number;
  totalCompletedBookings: number;
  totalPendingPayments: number;
  // Discount analytics
  totalDiscountGiven: number;
  revenueBeforeDiscount: number;
  revenueAfterDiscount: number;
  bookingsWithPromotion: number;
  mostUsedPromotion?: string;
  monthlyRevenue: MonthlyRevenue[];
}
