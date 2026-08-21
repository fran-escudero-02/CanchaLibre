-- Esquema inicial de CanchaLibre (MVP).
-- El esquema lo gestiona Flyway; Hibernate corre con ddl-auto=validate.

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(255),
    role          VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE complexes (
    id                    BIGSERIAL PRIMARY KEY,
    name                  VARCHAR(255) NOT NULL,
    address               VARCHAR(255),
    phone                 VARCHAR(255),
    open_time             TIME NOT NULL,
    close_time            TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL,
    is_active             BOOLEAN NOT NULL,
    owner_id              BIGINT NOT NULL,
    CONSTRAINT fk_complex_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE TABLE courts (
    id                  BIGSERIAL PRIMARY KEY,
    complex_id          BIGINT NOT NULL,
    name                VARCHAR(255) NOT NULL,
    sport               VARCHAR(255) NOT NULL,
    surface             VARCHAR(255) NOT NULL,
    is_indoor           BOOLEAN NOT NULL,
    price               NUMERIC(12,2) NOT NULL,
    deposit_percentage  INTEGER NOT NULL,
    is_active           BOOLEAN NOT NULL,
    CONSTRAINT fk_court_complex FOREIGN KEY (complex_id) REFERENCES complexes (id)
);

CREATE INDEX idx_courts_complex ON courts (complex_id);

CREATE TABLE slots (
    id               BIGSERIAL PRIMARY KEY,
    court_id         BIGINT NOT NULL,
    start_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at           TIMESTAMP WITH TIME ZONE NOT NULL,
    status           VARCHAR(255) NOT NULL,
    lock_expires_at  TIMESTAMP WITH TIME ZONE,
    locked_by_user_id BIGINT,
    block_reason     VARCHAR(255),
    CONSTRAINT uk_slot_court_start UNIQUE (court_id, start_at),
    CONSTRAINT fk_slot_court FOREIGN KEY (court_id) REFERENCES courts (id)
);

CREATE INDEX idx_slots_status_lock ON slots (status, lock_expires_at);

CREATE TABLE bookings (
    id               BIGSERIAL PRIMARY KEY,
    slot_id          BIGINT NOT NULL,
    player_id        BIGINT,
    guest_name       VARCHAR(255),
    guest_phone      VARCHAR(255),
    complex_id       BIGINT NOT NULL,
    total_amount     NUMERIC(12,2) NOT NULL,
    deposit_amount   NUMERIC(12,2) NOT NULL,
    remaining_amount NUMERIC(12,2) NOT NULL,
    status           VARCHAR(255) NOT NULL,
    source           VARCHAR(255) NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE,
    -- Sin UNIQUE(slot_id): un mismo slot puede tener reservas historicas
    -- (expiradas/canceladas) ademas de la activa.
    CONSTRAINT fk_booking_slot FOREIGN KEY (slot_id) REFERENCES slots (id),
    CONSTRAINT fk_booking_player FOREIGN KEY (player_id) REFERENCES users (id),
    CONSTRAINT fk_booking_complex FOREIGN KEY (complex_id) REFERENCES complexes (id)
);

CREATE INDEX idx_bookings_player ON bookings (player_id);
CREATE INDEX idx_bookings_slot ON bookings (slot_id);

CREATE TABLE payments (
    id               BIGSERIAL PRIMARY KEY,
    booking_id       BIGINT NOT NULL,
    mp_preference_id VARCHAR(255),
    mp_payment_id    BIGINT,
    status           VARCHAR(255),
    amount           NUMERIC(12,2),
    raw_payload      VARCHAR(4000),
    created_at       TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_payment_mp_id UNIQUE (mp_payment_id),
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings (id)
);

CREATE INDEX idx_payments_booking ON payments (booking_id);
