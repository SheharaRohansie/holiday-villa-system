export type UserRole = 'ADMIN' | 'STAFF' | 'GUEST';

export type VillaType = 'DELUXE' | 'SUPERIOR';

export type MealPlan = 'ROOM_ONLY' | 'BED_AND_BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD';

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
export interface VillaPricingInput {
  guestCount: number;
  mealPlan: MealPlan;
  price: number | string;
}

export interface VillaPricingRow {
  id: number;
  guestCount: number;
  mealPlan: MealPlan;
  price: number;
}

export interface VillaRequest {
  name: string;
  description: string;
  type: VillaType;
  amenities: string[];
  imageUrls: string[];
  pricing: VillaPricingInput[];
}

export interface Villa {
  id: number;
  name: string;
  description: string;
  type?: VillaType | null;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  averageRating: number;
  reviewCount: number;

  // Min-price label data for cards
  minPrice?: number | null;
  minPriceGuestCount?: number | null;
  minPriceMealPlan?: MealPlan | null;

  // Helps build the guest selector without rendering a pricing table
  allowedGuestCounts?: number[];
}

export interface AdminVillaResponse {
  villa: Villa;
  pricing: VillaPricingRow[];
}

export interface VillaPriceResponse {
  villaId: number;
  guestCount: number;
  mealPlan: MealPlan;
  pricePerNight: number;
}

export interface AuthContextType {
  user: AuthResponse | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// ---- Villa Availability ----
export interface BookedDateRange {
  checkInDate: string;  // ISO date "YYYY-MM-DD"
  checkOutDate: string; // ISO date "YYYY-MM-DD"
}

// ---- Booking Types ----
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';

export interface BookingRequest {
  villaId: number;
  guestCount: number;
  mealPlan: MealPlan;
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
  guestCount: number;
  mealPlan: MealPlan;
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

  // CARD (optional; only required/used when paymentMethod === 'CARD')
  cardNumber?: string;
  cardType?: 'VISA' | 'MASTERCARD';
  expiryDate?: string; // MM/YY
  cvv?: string;

  // BANK_TRANSFER (optional; only required/used when paymentMethod === 'BANK_TRANSFER')
  bankTransferFile?: File;
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

// ---- Review Types ----
export interface ReviewRequest {
  bookingId: number;
  villaId: number;
  rating: number;
  reviewText: string;
}

export interface ReviewUpdateRequest {
  rating: number;
  reviewText: string;
}

export interface Review {
  id: number;
  userId: number;
  guestName: string;
  villaId: number;
  villaName: string;
  bookingId: number;
  rating: number;
  reviewText: string;
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
  canEdit: boolean;
}

export interface VillaReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
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
