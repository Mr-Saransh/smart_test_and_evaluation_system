import React, { useState, useEffect } from 'react';
import { GET, PUT, toast } from '../../utils/api';
import { SkeletonTable } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { BuildingIcon } from '../../components/common/Icons';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { Modal } from '../../components/common/Modal';

export function Institutes() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingSub, setManagingSub] = useState(null);
  const [subForm, setSubForm] = useState({ subscription_status: 'trial', plan_price_per_student: 80, days_to_add: 7 });
  const [savingSub, setSavingSub] = useState(false);

  const load = () => {
    GET('/superadmin/institutes').then(setInstitutes).catch(() => {}).finally(() => setLoading(false));
  };
  
  useEffect(load, []);

  const toggleStatus = async (id, currentStatus) => {
    try {
      await PUT(`/superadmin/institutes/${id}/status`, { is_active: !currentStatus }, 'Institute status updated');
      load();
    } catch (e) {
      // toast already shown
    }
  };

  const openSubModal = (inst) => {
    setManagingSub(inst);
    setSubForm({
      subscription_status: inst.subscription_status || 'trial',
      plan_price_per_student: inst.plan_price_per_student || 80,
      days_to_add: 30
    });
  };

  const handleUpdateSubscription = async () => {
    if (!managingSub) return;
    setSavingSub(true);
    try {
      const now = new Date();
      let newTrialEndsAt = undefined;
      let newValidUntil = undefined;

      if (subForm.subscription_status === 'trial') {
        const d = new Date();
        d.setDate(d.getDate() + Number(subForm.days_to_add || 7));
        newTrialEndsAt = d;
      } else if (subForm.subscription_status === 'active') {
        const d = new Date();
        d.setDate(d.getDate() + Number(subForm.days_to_add || 30));
        newValidUntil = d;
      }

      await PUT(`/superadmin/institutes/${managingSub.id}/subscription`, {
        subscription_status: subForm.subscription_status,
        trial_ends_at: newTrialEndsAt,
        subscription_valid_until: newValidUntil,
        plan_price_per_student: Number(subForm.plan_price_per_student || 80)
      }, 'Institute subscription updated');

      setManagingSub(null);
      load();
    } catch (err) {
      toast(err.message || 'Failed to update subscription', 'error');
    } finally {
      setSavingSub(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Institutes</h1>
          <p className="page-subtitle">Manage all onboarded coaching institutes, trials & subscriptions</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : institutes.length === 0 ? (
            <EmptyState icon={BuildingIcon} title="No Institutes Found" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Institute Name</th>
                  <th>Admin Contact</th>
                  <th>Students & Batches</th>
                  <th>Subscription & Trial</th>
                  <th>Monthly Revenue</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map(inst => (
                  <tr key={inst.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inst.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{inst.city || 'No city'}, {inst.state || 'No state'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{inst.admin_name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{inst.admin_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {inst.student_count} Students
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {inst.batch_count} Batches • {inst.teacher_count} Teachers
                      </div>
                    </td>
                    <td>
                      {inst.computed_status === 'active' ? (
                        <div>
                          <span className="badge" style={{ background: '#d1fae5', color: '#059669' }}>
                            ACTIVE PLAN
                          </span>
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Valid until {inst.subscription_valid_until ? formatDate(inst.subscription_valid_until) : '1 Month'}
                          </div>
                        </div>
                      ) : inst.computed_status === 'trial' ? (
                        <div>
                          <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                            7-DAY TRIAL
                          </span>
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                            Ends {inst.trial_ends_at ? formatDate(inst.trial_ends_at) : 'In 7 days'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
                            TRIAL EXPIRED
                          </span>
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>
                            {formatCurrency(inst.monthly_billable)} due
                          </div>
                        </div>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(inst.monthly_billable)}
                      </strong>
                      <div className="muted" style={{ fontSize: 11 }}>@ ₹{inst.plan_price_per_student || 80}/student</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: inst.is_active ? '#d1fae5' : '#fee2e2', color: inst.is_active ? '#059669' : '#dc2626' }}>
                        {inst.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td>
                      <div className="fx" style={{ gap: 6 }}>
                        <button className="btn bs bsm" onClick={() => openSubModal(inst)}>
                          Subscription
                        </button>
                        <button className="btn bd bsm" onClick={() => toggleStatus(inst.id, inst.is_active)}>
                          {inst.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SuperAdmin Subscription Manage Modal */}
      {managingSub && (
        <Modal
          isOpen={Boolean(managingSub)}
          onClose={() => setManagingSub(null)}
          title={`Manage Subscription: ${managingSub.name}`}
          footer={
            <div className="fxb w-full" style={{ gap: 10 }}>
              <button className="btn bs" onClick={() => setManagingSub(null)} disabled={savingSub}>Cancel</button>
              <button className="btn bp" onClick={handleUpdateSubscription} disabled={savingSub}>
                {savingSub ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Subscription Status</label>
              <select 
                className="inp" 
                value={subForm.subscription_status} 
                onChange={(e) => setSubForm(prev => ({ ...prev, subscription_status: e.target.value }))}
              >
                <option value="trial">Free Trial (Active)</option>
                <option value="active">Paid Subscription (Active)</option>
                <option value="expired">Trial Expired (Payment Due)</option>
              </select>
            </div>

            <div className="field">
              <label>Days to Add / Validity Length</label>
              <input 
                className="inp" 
                type="number" 
                value={subForm.days_to_add} 
                onChange={(e) => setSubForm(prev => ({ ...prev, days_to_add: e.target.value }))} 
                placeholder="e.g. 7, 30, 90" 
              />
            </div>

            <div className="field">
              <label>Price Per Student (₹ / month)</label>
              <input 
                className="inp" 
                type="number" 
                value={subForm.plan_price_per_student} 
                onChange={(e) => setSubForm(prev => ({ ...prev, plan_price_per_student: e.target.value }))} 
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
