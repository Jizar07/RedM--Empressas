'use client';

import { useState } from 'react';
import { Upload, Send, Loader2, Check, X, FileImage, DollarSign, AlertTriangle } from 'lucide-react';

interface ServiceFormData {
  playerName: string;
  serviceType: 'animal' | 'plant';
  animalType?: string;
  plantType?: string;
  customPlantName?: string;
  quantity: number;
  screenshot: File | null;
  screenshotPreview?: string;
}

// Service configuration
const SERVICE_CONFIG = {
  animals: {
    Bovino: { displayName: 'Bovino (Cows)' },
    Ovino: { displayName: 'Ovino (Sheep)' },
    Suino: { displayName: 'Suino (Pigs)' },
    Caprino: { displayName: 'Caprino (Goats)' },
    Equino: { displayName: 'Equino (Horses)' },
    Avino: { displayName: 'Avino (Chickens)' }
  },
  plants: {
    basic: {
      Milho: { displayName: 'Milho (Corn)', price: 0.15 },
      Trigo: { displayName: 'Trigo (Wheat)', price: 0.15 },
      Junco: { displayName: 'Junco (Reed)', price: 0.15 }
    },
    other: { price: 0.20 }
  },
  farm: {
    animalCost: 90,
    requiredProfit: 10,
    optimalIncome: 160
  }
};

const ServiceSubmission = () => {
  const [formData, setFormData] = useState<ServiceFormData>({
    playerName: '',
    serviceType: 'animal',
    quantity: 4, // Default to 4 for animals
    screenshot: null
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  // Handle screenshot upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Screenshot must be less than 5MB');
        return;
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        screenshot: file,
        screenshotPreview: previewUrl
      }));
      setError('');
    }
  };

  // Calculate estimated earnings for plants
  const calculatePlantEarnings = () => {
    const { plantType, quantity } = formData;
    
    if (plantType && plantType !== 'other') {
      return quantity * SERVICE_CONFIG.plants.basic[plantType as keyof typeof SERVICE_CONFIG.plants.basic].price;
    }
    
    if (plantType === 'other') {
      return quantity * SERVICE_CONFIG.plants.other.price;
    }
    
    return 0;
  };

  // Get service description
  const getServiceDescription = () => {
    if (formData.serviceType === 'animal') {
      return `Delivery of ${formData.quantity} animals to slaughterhouse. Payment depends on farm income from screenshot.`;
    }
    
    if (formData.serviceType === 'plant') {
      const earnings = calculatePlantEarnings();
      return `Deposit of ${formData.quantity} plants to inventory. Estimated payment: $${earnings.toFixed(2)}`;
    }
    
    return '';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.playerName.trim()) {
      setError('Player name is required');
      return;
    }
    
    if (formData.serviceType === 'animal' && !formData.animalType) {
      setError('Please select an animal type');
      return;
    }
    
    if (formData.serviceType === 'plant' && !formData.plantType) {
      setError('Please select a plant type');
      return;
    }
    
    if (formData.plantType === 'other' && !formData.customPlantName?.trim()) {
      setError('Please specify the plant name');
      return;
    }
    
    if (!formData.screenshot) {
      setError('Screenshot is required as proof of delivery');
      return;
    }
    
    if (formData.quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Create FormData for multipart upload
      const submitData = new FormData();
      submitData.append('playerName', formData.playerName.trim());
      submitData.append('serviceType', formData.serviceType);
      submitData.append('quantity', formData.quantity.toString());
      
      if (formData.animalType) {
        submitData.append('animalType', formData.animalType);
      }
      
      if (formData.plantType) {
        submitData.append('plantType', formData.plantType);
      }
      
      if (formData.customPlantName) {
        submitData.append('customPlantName', formData.customPlantName.trim());
      }
      
      submitData.append('screenshot', formData.screenshot);
      
      // Submit to API
      const response = await fetch('/api/service-submissions', {
        method: 'POST',
        body: submitData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setReceipt(result.receipt);
        
        // Reset form after 10 seconds
        setTimeout(() => {
          setFormData({
            playerName: '',
            serviceType: 'animal',
            quantity: 4,
            screenshot: null
          });
          setSuccess(false);
          setReceipt(null);
        }, 10000);
      } else {
        setError(result.error || 'Failed to submit service');
      }
    } catch (error: any) {
      setError('Error submitting service: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Farm Service Submission</h1>
        <p className="text-gray-600 mb-8">Submit your completed deliveries for payment processing</p>

        {/* Success Receipt */}
        {success && receipt && (
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-green-800">Receipt Generated Successfully!</h2>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="space-y-2 text-sm font-mono">
                <p className="font-bold text-gray-900">
                  {receipt.playerName} completed {receipt.serviceType} service - {receipt.timestamp}
                </p>
                
                {receipt.serviceType === 'animal' && (
                  <>
                    <p>Delivered: {receipt.quantity} {receipt.animalType} to slaughterhouse</p>
                    <p>Farm received: ${receipt.farmIncome.toFixed(2)}</p>
                    <p>Farm costs: ${receipt.farmCost.toFixed(2)}</p>
                    <p>Farm profit: ${receipt.farmProfit.toFixed(2)}</p>
                    
                    {receipt.status === 'OPTIMAL' && (
                      <p className="text-green-600 font-bold">
                        Player payment: ${receipt.playerPayment.toFixed(2)} ✅
                      </p>
                    )}
                    
                    {receipt.status === 'SUBOPTIMAL' && (
                      <>
                        <p className="text-yellow-600 font-bold">
                          Player payment: ${receipt.playerPayment.toFixed(2)} ⚠️
                        </p>
                        <p className="text-yellow-600">
                          Penalty: -${receipt.penalty.toFixed(2)} (animals under age 50)
                        </p>
                      </>
                    )}
                    
                    {receipt.status === 'CRITICAL' && (
                      <>
                        <p className="text-red-600 font-bold">
                          Player payment: $0.00 ❌
                        </p>
                        {receipt.playerDebt > 0 && (
                          <p className="text-red-600">
                            Player owes farm: ${receipt.playerDebt.toFixed(2)}
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
                
                {receipt.serviceType === 'plant' && (
                  <>
                    <p>Deposited: {receipt.quantity} {receipt.plantName} to inventory</p>
                    <p className="text-green-600 font-bold">
                      Player payment: ${receipt.playerPayment.toFixed(2)} ✅
                    </p>
                  </>
                )}
                
                <p className="text-gray-500 mt-2">
                  Receipt ID: #{receipt.receiptId}
                </p>
              </div>
              
              {receipt.screenshotPath && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500">Screenshot saved: {receipt.screenshotPath}</p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-green-700 mt-4">
              Receipt saved to: /data/players/{receipt.playerName}/receipts/
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2">
            <X className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player Name
            </label>
            <input
              type="text"
              value={formData.playerName}
              onChange={(e) => setFormData(prev => ({ ...prev, playerName: e.target.value }))}
              placeholder="Enter your in-game name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  serviceType: 'animal',
                  quantity: 4, // Reset to 4 for animals
                  plantType: undefined,
                  customPlantName: undefined
                }))}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  formData.serviceType === 'animal'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="text-2xl mb-2 block">🐄</span>
                <span className="font-medium">Animal Service</span>
                <p className="text-xs text-gray-600 mt-1">Delivery to slaughterhouse</p>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  serviceType: 'plant',
                  quantity: 1, // Reset to 1 for plants
                  animalType: undefined
                }))}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  formData.serviceType === 'plant'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="text-2xl mb-2 block">🌾</span>
                <span className="font-medium">Plant Service</span>
                <p className="text-xs text-gray-600 mt-1">Deposit to inventory</p>
              </button>
            </div>
          </div>

          {/* Animal Type Selection */}
          {formData.serviceType === 'animal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animal Type
              </label>
              <select
                value={formData.animalType || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, animalType: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select animal type</option>
                {Object.entries(SERVICE_CONFIG.animals).map(([key, value]) => (
                  <option key={key} value={key}>{value.displayName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Plant Type Selection */}
          {formData.serviceType === 'plant' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plant Type
                </label>
                <select
                  value={formData.plantType || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, plantType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="">Select plant type</option>
                  <optgroup label="Basic Plants ($0.15/unit)">
                    {Object.entries(SERVICE_CONFIG.plants.basic).map(([key, value]) => (
                      <option key={key} value={key}>{value.displayName}</option>
                    ))}
                  </optgroup>
                  <option value="other">Other Plants ($0.20/unit)</option>
                </select>
              </div>

              {/* Custom Plant Name */}
              {formData.plantType === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specify Plant Name
                  </label>
                  <input
                    type="text"
                    value={formData.customPlantName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, customPlantName: e.target.value }))}
                    placeholder="Enter specific plant name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
            </>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              min="1"
              max="9999"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
            {formData.serviceType === 'animal' && formData.quantity !== 4 && (
              <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Standard delivery is 4 animals
              </p>
            )}
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Screenshot (Required)
            </label>
            
            <div className="mt-2">
              <label className="cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors ${
                  formData.screenshot ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}>
                  {formData.screenshotPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={formData.screenshotPreview} 
                        alt="Screenshot preview" 
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-green-600 font-medium">
                        Screenshot uploaded successfully
                      </p>
                      <p className="text-xs text-gray-500">
                        Click to change screenshot
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileImage className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-gray-600">
                        Click to upload screenshot
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
              </label>
            </div>
            
            {formData.serviceType === 'animal' && (
              <p className="text-sm text-gray-600 mt-2">
                Screenshot must show "Sucesso" message with farm income amount
              </p>
            )}
            
            {formData.serviceType === 'plant' && (
              <p className="text-sm text-gray-600 mt-2">
                Screenshot must show inventory deposit confirmation
              </p>
            )}
          </div>

          {/* Service Info */}
          <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg">
            <div className="flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-900 font-medium">Service Information</p>
                <p className="text-sm text-blue-700 mt-1">
                  {getServiceDescription()}
                </p>
                
                {formData.serviceType === 'animal' && (
                  <div className="mt-2 text-xs text-blue-600 space-y-1">
                    <p>• Farm costs: $90 | Required profit: $10</p>
                    <p>• Optimal income (age 50): $160 → You get $60</p>
                    <p>• Suboptimal (age {'<'}50): Income {'<'} $160 → You get less</p>
                    <p>• Critical (income {'<'} $100): You get $0 and may owe difference</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.screenshot}
            className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Screenshot...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Submit Service for Verification
              </>
            )}
          </button>
        </form>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Important Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Enter your exact in-game name</li>
            <li>Select the correct service type</li>
            <li>For animals: Screenshot must show the "Sucesso" message with farm income</li>
            <li>For plants: Screenshot must show the inventory deposit confirmation</li>
            <li>Payment is calculated automatically based on screenshot verification</li>
            <li>Animal payments vary based on animal age (age 50 = full payment)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ServiceSubmission;