import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlwaysShareLocation1700000003000 implements MigrationInterface {
  name = 'AlwaysShareLocation1700000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN location_consent SET DEFAULT true`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN share_active_position SET DEFAULT true`);
    await queryRunner.query(`
      UPDATE users
      SET location_consent = true,
          location_consent_at = COALESCE(location_consent_at, now()),
          share_active_position = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN location_consent SET DEFAULT false`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN share_active_position SET DEFAULT false`);
  }
}
