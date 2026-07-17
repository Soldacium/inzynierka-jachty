import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertSourceAndPortImport1700000001000 implements MigrationInterface {
  name = 'AlertSourceAndPortImport1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE alert_source AS ENUM ('user', 'official')`);
    await queryRunner.query(`ALTER TABLE alerts ADD COLUMN source alert_source NOT NULL DEFAULT 'user'`);
    await queryRunner.query(`
      UPDATE alerts SET source = 'official'
      WHERE author_id IN (SELECT id FROM users WHERE role IN ('admin', 'port_manager'))
    `);
    await queryRunner.query(`ALTER TABLE ports ADD COLUMN source varchar(40) NOT NULL DEFAULT 'manual'`);
    await queryRunner.query(`ALTER TABLE ports ADD COLUMN external_id varchar(120)`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_ports_external_source ON ports (source, external_id) WHERE external_id IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ports_external_source`);
    await queryRunner.query(`ALTER TABLE ports DROP COLUMN IF EXISTS external_id`);
    await queryRunner.query(`ALTER TABLE ports DROP COLUMN IF EXISTS source`);
    await queryRunner.query(`ALTER TABLE alerts DROP COLUMN IF EXISTS source`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_source`);
  }
}
