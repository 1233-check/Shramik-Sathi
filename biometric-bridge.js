// Shramik Sathi — Biometric Device API Bridge
// Interface layer for connecting biometric attendance devices to Supabase
// Supports: Fingerprint scanners, Punch card machines, Face recognition terminals
//
// USAGE: Hardware vendors integrate via the BiometricBridge.processEvent() method.
// Each device sends a JSON payload, and the bridge normalizes + upserts to attendance.

(function() {
  const sb = getSupabaseClient();

  window.BiometricBridge = {

    // Supported device types
    DEVICE_TYPES: Object.freeze({
      FINGERPRINT: 'fingerprint',
      PUNCH_CARD: 'punch_card',
      FACE_RECOGNITION: 'face_recognition'
    }),

    /**
     * Process a single biometric event from any device type.
     * Normalizes the payload and upserts into the attendance table.
     *
     * @param {Object} event — Device payload
     * @param {string} event.device_type — 'fingerprint' | 'punch_card' | 'face_recognition'
     * @param {string} event.device_id — Unique device identifier (e.g., 'FP-GATE-01')
     * @param {string} event.emp_id — Employee ID (text, e.g., '20147')
     * @param {string} event.timestamp — ISO 8601 timestamp of the scan
     * @param {string} [event.direction] — 'IN' or 'OUT' (for check-in/check-out)
     * @param {number} [event.confidence] — Recognition confidence (0-1, for face recognition)
     * @returns {Object} { success, record }
     */
    async processEvent(event) {
      try {
        // 1. Validate required fields
        if (!event.emp_id || !event.timestamp || !event.device_type) {
          throw new Error('Missing required fields: emp_id, timestamp, device_type');
        }

        // 2. Resolve emp_id to employee UUID
        const { data: emp, error: empErr } = await sb
          .from('employees')
          .select('id')
          .eq('emp_id', event.emp_id)
          .single();
        if (empErr || !emp) throw new Error(`Employee ${event.emp_id} not found`);

        // 3. Parse timestamp
        const dt = new Date(event.timestamp);
        const dateStr = dt.toISOString().slice(0, 10);
        const timeStr = dt.toTimeString().slice(0, 8);

        // 4. Determine if check-in or check-out
        const direction = (event.direction || 'IN').toUpperCase();

        // 5. Build attendance record
        const record = {
          employee_id: emp.id,
          attendance_date: dateStr,
          method: event.device_type,
          status: 'Present'
        };

        if (direction === 'IN') {
          record.check_in = timeStr;
        } else if (direction === 'OUT') {
          record.check_out = timeStr;
        }

        // 6. Upsert — update if already exists for this date
        // For check-out, we want to update the existing record
        const { data: existing } = await sb
          .from('attendance')
          .select('id, check_in')
          .eq('employee_id', emp.id)
          .eq('attendance_date', dateStr)
          .single();

        if (existing && direction === 'OUT') {
          // Calculate hours worked
          const checkIn = existing.check_in;
          if (checkIn) {
            const inParts = checkIn.split(':').map(Number);
            const outParts = timeStr.split(':').map(Number);
            const hoursWorked = ((outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1])) / 60;
            record.hours_worked = Math.round(hoursWorked * 100) / 100;
            record.overtime_hours = Math.max(0, Math.round((hoursWorked - 8) * 100) / 100);
          }
          const { error } = await sb.from('attendance')
            .update(record).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await sb.from('attendance')
            .upsert(record, { onConflict: 'employee_id,attendance_date' });
          if (error) throw error;
        }

        console.log(`[BiometricBridge] ${direction} recorded: ${event.emp_id} at ${timeStr} via ${event.device_type}`);
        return { success: true, record };

      } catch (e) {
        console.error('[BiometricBridge] processEvent error:', e);
        return { success: false, error: e.message };
      }
    },

    /**
     * Process a batch of biometric events (e.g., daily sync from device)
     * @param {Array} events — Array of event objects
     * @returns {Object} { success, processed, failed, errors }
     */
    async processBatch(events) {
      const results = { processed: 0, failed: 0, errors: [] };
      for (const event of events) {
        const result = await this.processEvent(event);
        if (result.success) results.processed++;
        else { results.failed++; results.errors.push({ emp_id: event.emp_id, error: result.error }); }
      }
      results.success = results.failed === 0;
      console.log(`[BiometricBridge] Batch complete: ${results.processed} OK, ${results.failed} failed`);
      return results;
    },

    /**
     * Webhook endpoint handler — for devices that POST JSON to a URL.
     * This is the expected payload format for integration:
     *
     * POST /api/biometric-webhook
     * Content-Type: application/json
     *
     * {
     *   "device_type": "fingerprint",
     *   "device_id": "FP-GATE-01",
     *   "emp_id": "20147",
     *   "timestamp": "2026-05-21T08:00:00+05:30",
     *   "direction": "IN",
     *   "confidence": 0.98
     * }
     *
     * For batch sync:
     * { "events": [ {...}, {...} ] }
     */

    /**
     * Get device status summary (for admin dashboard)
     * Shows last activity time per device
     */
    async getDeviceStatus() {
      // This would query a devices registry table (future implementation)
      return {
        note: 'Device registry not yet implemented. Configure devices to POST to BiometricBridge.processEvent().',
        supported: Object.values(this.DEVICE_TYPES),
        integration_docs: {
          fingerprint: 'ZKTeco / eSSL SDK → HTTP POST → processEvent()',
          punch_card: 'Card reader serial → Node.js bridge → processEvent()',
          face_recognition: 'HIKVISION / Dahua API → processEvent()'
        }
      };
    }
  };
})();
