import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationRouteRetention1700000004000 implements MigrationInterface {
  name = 'LocationRouteRetention1700000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE location_samples ADD COLUMN route_id uuid REFERENCES sailing_routes(id) ON DELETE SET NULL`);
    await queryRunner.query(`CREATE INDEX idx_location_samples_route ON location_samples (route_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_location_samples_route`);
    await queryRunner.query(`ALTER TABLE location_samples DROP COLUMN route_id`);
  }
}
