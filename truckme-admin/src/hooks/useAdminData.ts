import { useState, useEffect, useCallback } from 'react';
import adminClient, { API_HOST } from '../api/adminClient';
import axios from 'axios';
import {
  DashboardStats,
  LiveFleetDriver,
  CustomerUser,
  DriverPartner,
  KycApplicant,
  BookingRecord,
  PayoutRequest,
} from '../types';

export function useAdminData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fleet, setFleet] = useState<LiveFleetDriver[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [drivers, setDrivers] = useState<DriverPartner[]>([]);
  const [kycQueue, setKycQueue] = useState<KycApplicant[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [sRes, fRes, cRes, dRes, kRes, bRes, pRes] = await Promise.all([
        adminClient.get<DashboardStats>('/dashboard-stats').catch(() => ({ data: null })),
        adminClient.get<LiveFleetDriver[]>('/live-fleet').catch(() => ({ data: [] })),
        adminClient.get<CustomerUser[]>('/customers').catch(() => ({ data: [] })),
        adminClient.get<DriverPartner[]>('/drivers/all').catch(() => ({ data: [] })),
        adminClient.get<KycApplicant[]>('/drivers/pending-approval').catch(() => ({ data: [] })),
        adminClient.get<BookingRecord[]>('/bookings').catch(() => ({ data: [] })),
        axios.get<PayoutRequest[]>(`${API_HOST}/api/payouts/admin/pending`, { headers: { 'bypass-tunnel-reminder': 'true' } }).catch(() => ({ data: [] })),
      ]);

      if (sRes.data) setStats(sRes.data);
      if (Array.isArray(fRes.data)) setFleet(fRes.data);
      if (Array.isArray(cRes.data)) setCustomers(cRes.data);
      if (Array.isArray(dRes.data)) setDrivers(dRes.data);
      if (Array.isArray(kRes.data)) setKycQueue(kRes.data);
      if (Array.isArray(bRes.data)) setBookings(bRes.data);
      if (Array.isArray(pRes.data)) setPayouts(pRes.data);

      setError(null);
    } catch (err: any) {
      console.error('[Admin Hook Error]', err);
      setError('Failed to sync admin data feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(), 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    stats,
    fleet,
    customers,
    drivers,
    kycQueue,
    bookings,
    payouts,
    loading,
    refreshing,
    error,
    refresh: () => fetchAll(true),
  };
}
