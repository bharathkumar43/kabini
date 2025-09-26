import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2, Search, ShoppingCart, Package, Zap, Plus, Copy, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { SuccessNotification } from './ui/SuccessNotification';

// ... existing code ...

