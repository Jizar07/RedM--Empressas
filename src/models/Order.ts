import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

export interface IOrder extends Document {
  orderId: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  customerDiscordTag: string;
  supplierId: string;
  supplierName: string;
  supplierDiscordTag: string;
  firmId: string;
  firmName: string;
  itemName: string;
  itemQuantity: number;
  message: string;
  notes?: string;
  channelId?: string;
  messageId?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending',
    required: true
  },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerDiscordTag: { type: String, required: true },
  supplierId: { type: String, required: true },
  supplierName: { type: String, required: true },
  supplierDiscordTag: { type: String, required: true },
  firmId: { type: String, required: true },
  firmName: { type: String, required: true },
  itemName: { type: String, required: true },
  itemQuantity: { type: Number, required: true, min: 1 },
  message: { type: String, required: true },
  notes: { type: String },
  channelId: { type: String },
  messageId: { type: String },
  acceptedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String }
}, { timestamps: true });

OrderSchema.index({ customerId: 1, status: 1 });
OrderSchema.index({ supplierId: 1, status: 1 });
OrderSchema.index({ firmId: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);