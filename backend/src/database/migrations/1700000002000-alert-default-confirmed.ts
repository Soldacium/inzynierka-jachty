import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertDefaultConfirmed1700000002000 implements MigrationInterface {
  name = 'AlertDefaultConfirmed1700000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'confirmed'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'pending'`);
  }
}
