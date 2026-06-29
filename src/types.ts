export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  totalAmount: number;
  items: InvoiceItem[];
  sourceFile?: string;
  sourceFileType?: string;
  extracted: boolean;
  createdAt: string;
  status?: "paid" | "unpaid";
}

export interface Customer {
  id: string;
  name: string;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  invoices: Invoice[];
  payments: Payment[];
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  note: string;
  createdAt: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

export interface DashboardData {
  totalInvoices: number;
  totalSales: number;
  debtorCount: number;
  totalRemainingDebt: number;
  recentInvoices: Invoice[];
  salesTrend: { date: string; amount: number }[];
}
