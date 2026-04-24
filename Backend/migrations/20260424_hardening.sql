-- Queue token uniqueness guarantees
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_tokens_doctor_date_number
ON queue_tokens (doctor_id, queue_date, token_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_tokens_appointment
ON queue_tokens (appointment_id);

-- Tenant-centric performance indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_email
ON users (tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_doctors_tenant
ON doctors (tenant_id);

CREATE INDEX IF NOT EXISTS idx_patients_tenant
ON patients (tenant_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_tenant_doctor_date
ON time_slots (tenant_id, doctor_id, slot_date);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_slot
ON appointments (tenant_id, slot_id);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_doctor_date
ON appointments (tenant_id, doctor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_queue_tokens_tenant_doctor_date_status
ON queue_tokens (tenant_id, doctor_id, queue_date, status);

-- Audit + soft delete columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE doctor_availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE doctor_availability ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE doctor_availability ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE doctor_daily_counter ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE doctor_daily_counter ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE doctor_daily_counter ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
