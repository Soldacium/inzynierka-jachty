import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('sailor', 'port_manager', 'admin')`);
    await queryRunner.query(`CREATE TYPE port_status AS ENUM ('pending', 'active', 'inactive', 'rejected')`);
    await queryRunner.query(`CREATE TYPE route_status AS ENUM ('draft', 'planned', 'active', 'completed', 'cancelled')`);
    await queryRunner.query(`CREATE TYPE alert_status AS ENUM ('pending', 'confirmed', 'rejected', 'expired', 'resolved')`);
    await queryRunner.query(`CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical')`);
    await queryRunner.query(`CREATE TYPE traffic_level AS ENUM ('low', 'medium', 'high')`);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(320) NOT NULL UNIQUE,
        password_hash varchar NOT NULL,
        "displayName" varchar(120) NOT NULL,
        role user_role NOT NULL DEFAULT 'sailor',
        is_blocked boolean NOT NULL DEFAULT false,
        location_consent boolean NOT NULL DEFAULT false,
        location_consent_at timestamptz,
        share_active_position boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        replaced_by_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE ports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(160) NOT NULL,
        description text NOT NULL DEFAULT '',
        location geometry(Point, 4326) NOT NULL,
        contact_email varchar(320),
        contact_phone varchar(50),
        vhf_channel varchar(30),
        status port_status NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_ports_name ON ports (name)');
    await queryRunner.query('CREATE INDEX idx_ports_location ON ports USING gist (location)');
    await queryRunner.query(`
      CREATE TABLE port_managers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        port_id uuid NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (port_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE port_availability (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        port_id uuid NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
        available_spots integer CHECK (available_spots IS NULL OR available_spots >= 0),
        status varchar(30) NOT NULL DEFAULT 'unknown',
        updated_by_id uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_port_availability_latest ON port_availability (port_id, created_at DESC)');
    await queryRunner.query(`
      CREATE TABLE port_facilities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        port_id uuid NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
        code varchar(80) NOT NULL,
        name varchar(160) NOT NULL,
        details text,
        available boolean NOT NULL DEFAULT true,
        UNIQUE (port_id, code)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE port_notices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        port_id uuid NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
        title varchar(160) NOT NULL,
        body text NOT NULL,
        author_id uuid NOT NULL REFERENCES users(id),
        valid_until timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE sailing_routes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(160) NOT NULL,
        status route_status NOT NULL DEFAULT 'draft',
        path geometry(LineString, 4326) NOT NULL,
        distance_meters double precision NOT NULL DEFAULT 0,
        started_at timestamptz,
        finished_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_sailing_routes_user ON sailing_routes (user_id)');
    await queryRunner.query('CREATE INDEX idx_sailing_routes_path ON sailing_routes USING gist (path)');
    await queryRunner.query(`
      CREATE TABLE route_points (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id uuid NOT NULL REFERENCES sailing_routes(id) ON DELETE CASCADE,
        position integer NOT NULL,
        location geometry(Point, 4326) NOT NULL,
        label varchar(160),
        UNIQUE (route_id, position)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE location_samples (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_generated_id uuid NOT NULL,
        location geometry(Point, 4326) NOT NULL,
        accuracy real NOT NULL CHECK (accuracy >= 0),
        speed real,
        heading real,
        recorded_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, client_generated_id)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_location_samples_user_time ON location_samples (user_id, recorded_at DESC)');
    await queryRunner.query('CREATE INDEX idx_location_samples_location ON location_samples USING gist (location)');
    await queryRunner.query(`
      CREATE TABLE traffic_cells (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cell_key varchar(100) NOT NULL,
        center geometry(Point, 4326) NOT NULL,
        sample_count integer NOT NULL,
        unique_users integer NOT NULL,
        level traffic_level NOT NULL,
        bucket_start timestamptz NOT NULL,
        calculated_at timestamptz NOT NULL,
        UNIQUE (cell_key, bucket_start)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_traffic_cells_time ON traffic_cells (bucket_start DESC)');
    await queryRunner.query('CREATE INDEX idx_traffic_cells_center ON traffic_cells USING gist (center)');
    await queryRunner.query(`
      CREATE TABLE alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        type varchar(60) NOT NULL,
        description text NOT NULL,
        location geometry(Point, 4326) NOT NULL,
        severity alert_severity NOT NULL DEFAULT 'medium',
        status alert_status NOT NULL DEFAULT 'pending',
        author_id uuid NOT NULL REFERENCES users(id),
        port_id uuid REFERENCES ports(id) ON DELETE SET NULL,
        valid_until timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_alerts_location ON alerts USING gist (location)');
    await queryRunner.query(`
      CREATE TABLE conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        port_id uuid NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE conversation_participants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (conversation_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX idx_messages_conversation_time ON messages (conversation_id, created_at DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'messages', 'conversation_participants', 'conversations', 'alerts', 'traffic_cells',
      'location_samples', 'route_points', 'sailing_routes', 'port_notices', 'port_facilities',
      'port_availability', 'port_managers', 'ports', 'password_reset_tokens', 'refresh_tokens', 'users',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    for (const type of ['traffic_level', 'alert_severity', 'alert_status', 'route_status', 'port_status', 'user_role']) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${type}`);
    }
  }
}
