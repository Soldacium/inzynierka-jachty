import type { LineString, Point } from 'geojson';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  Sailor = 'sailor',
  PortManager = 'port_manager',
  Admin = 'admin',
}

export enum PortStatus {
  Pending = 'pending',
  Active = 'active',
  Inactive = 'inactive',
  Rejected = 'rejected',
}

export enum RouteStatus {
  Draft = 'draft',
  Planned = 'planned',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum AlertStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Rejected = 'rejected',
  Expired = 'expired',
  Resolved = 'resolved',
}

export enum AlertSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

export enum AlertSource {
  User = 'user',
  Official = 'official',
}

export enum TrafficLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 320 }) email!: string;
  @Column({ name: 'password_hash', type: 'varchar' }) passwordHash!: string;
  @Column({ type: 'varchar', length: 120 }) displayName!: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.Sailor }) role!: UserRole;
  @Column({ name: 'is_blocked', type: 'boolean', default: false }) isBlocked!: boolean;
  @Column({ name: 'location_consent', type: 'boolean', default: false }) locationConsent!: boolean;
  @Column({ name: 'location_consent_at', type: 'timestamptz', nullable: true }) locationConsentAt!: Date | null;
  @Column({ name: 'share_active_position', type: 'boolean', default: false }) shareActivePosition!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @OneToMany(() => RefreshToken, (token) => token.user) refreshTokens!: RefreshToken[];
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user!: User;
  @Index({ unique: true }) @Column({ name: 'token_hash', type: 'varchar' }) tokenHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true }) replacedById!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Index({ unique: true }) @Column({ name: 'token_hash', type: 'varchar' }) tokenHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('ports')
export class Port {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'text', default: '' }) description!: string;
  @Index({ spatial: true }) @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }) location!: Point;
  @Column({ name: 'contact_email', type: 'varchar', length: 320, nullable: true }) contactEmail!: string | null;
  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true }) contactPhone!: string | null;
  @Column({ name: 'vhf_channel', type: 'varchar', length: 30, nullable: true }) vhfChannel!: string | null;
  @Column({ type: 'enum', enum: PortStatus, default: PortStatus.Pending }) status!: PortStatus;
  @Column({ type: 'varchar', length: 40, default: 'manual' }) source!: string;
  @Column({ name: 'external_id', type: 'varchar', length: 120, nullable: true }) externalId!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @OneToMany(() => PortManager, (manager) => manager.port) managers!: PortManager[];
  @OneToMany(() => PortAvailability, (availability) => availability.port) availability!: PortAvailability[];
  @OneToMany(() => PortFacility, (facility) => facility.port) facilities!: PortFacility[];
  @OneToMany(() => PortNotice, (notice) => notice.port) notices!: PortNotice[];
}

@Entity('port_managers')
@Unique(['portId', 'userId'])
export class PortManager {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'port_id', type: 'uuid' }) portId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => Port, (port) => port.managers, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'port_id' }) port!: Port;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('port_availability')
export class PortAvailability {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'port_id', type: 'uuid' }) portId!: string;
  @ManyToOne(() => Port, (port) => port.availability, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'port_id' }) port!: Port;
  @Column({ name: 'available_spots', type: 'integer', nullable: true }) availableSpots!: number | null;
  @Column({ type: 'varchar', length: 30, default: 'unknown' }) status!: string;
  @Column({ name: 'updated_by_id', type: 'uuid' }) updatedById!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('port_facilities')
@Unique(['portId', 'code'])
export class PortFacility {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'port_id', type: 'uuid' }) portId!: string;
  @ManyToOne(() => Port, (port) => port.facilities, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'port_id' }) port!: Port;
  @Column({ type: 'varchar', length: 80 }) code!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'text', nullable: true }) details!: string | null;
  @Column({ type: 'boolean', default: true }) available!: boolean;
}

@Entity('port_notices')
export class PortNotice {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'port_id', type: 'uuid' }) portId!: string;
  @ManyToOne(() => Port, (port) => port.notices, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'port_id' }) port!: Port;
  @Column({ type: 'varchar', length: 160 }) title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ name: 'author_id', type: 'uuid' }) authorId!: string;
  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true }) validUntil!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('sailing_routes')
export class SailingRoute {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.Draft }) status!: RouteStatus;
  @Index({ spatial: true }) @Column({ type: 'geometry', spatialFeatureType: 'LineString', srid: 4326 }) path!: LineString;
  @Column({ name: 'distance_meters', type: 'double precision', default: 0 }) distanceMeters!: number;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true }) startedAt!: Date | null;
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true }) finishedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @OneToMany(() => RoutePoint, (point) => point.route) points!: RoutePoint[];
}

@Entity('route_points')
@Unique(['routeId', 'position'])
export class RoutePoint {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'route_id', type: 'uuid' }) routeId!: string;
  @ManyToOne(() => SailingRoute, (route) => route.points, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'route_id' }) route!: SailingRoute;
  @Column({ type: 'integer' }) position!: number;
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }) location!: Point;
  @Column({ type: 'varchar', length: 160, nullable: true }) label!: string | null;
}

@Entity('location_samples')
@Unique(['userId', 'clientGeneratedId'])
export class LocationSample {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ name: 'client_generated_id', type: 'uuid' }) clientGeneratedId!: string;
  @Index({ spatial: true }) @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }) location!: Point;
  @Column({ type: 'real' }) accuracy!: number;
  @Column({ type: 'real', nullable: true }) speed!: number | null;
  @Column({ type: 'real', nullable: true }) heading!: number | null;
  @Index() @Column({ name: 'recorded_at', type: 'timestamptz' }) recordedAt!: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('traffic_cells')
@Unique(['cellKey', 'bucketStart'])
export class TrafficCell {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'cell_key', type: 'varchar', length: 100 }) cellKey!: string;
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }) center!: Point;
  @Column({ name: 'sample_count', type: 'integer' }) sampleCount!: number;
  @Column({ name: 'unique_users', type: 'integer' }) uniqueUsers!: number;
  @Column({ type: 'enum', enum: TrafficLevel }) level!: TrafficLevel;
  @Index() @Column({ name: 'bucket_start', type: 'timestamptz' }) bucketStart!: Date;
  @Column({ name: 'calculated_at', type: 'timestamptz' }) calculatedAt!: Date;
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 60 }) type!: string;
  @Column({ type: 'text' }) description!: string;
  @Index({ spatial: true }) @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 }) location!: Point;
  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.Medium }) severity!: AlertSeverity;
  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.Confirmed }) status!: AlertStatus;
  @Column({ type: 'enum', enum: AlertSource, default: AlertSource.User }) source!: AlertSource;
  @Column({ name: 'author_id', type: 'uuid' }) authorId!: string;
  @Column({ name: 'port_id', type: 'uuid', nullable: true }) portId!: string | null;
  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true }) validUntil!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'port_id', type: 'uuid' }) portId!: string;
  @ManyToOne(() => Port, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'port_id' }) port!: Port;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @OneToMany(() => ConversationParticipant, (participant) => participant.conversation) participants!: ConversationParticipant[];
  @OneToMany(() => Message, (message) => message.conversation) messages!: Message[];
}

@Entity('conversation_participants')
@Unique(['conversationId', 'userId'])
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'conversation_id', type: 'uuid' }) conversationId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => Conversation, (conversation) => conversation.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' }) conversation!: Conversation;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true }) lastReadAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'conversation_id', type: 'uuid' }) conversationId!: string;
  @Column({ name: 'sender_id', type: 'uuid' }) senderId!: string;
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' }) conversation!: Conversation;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'sender_id' }) sender!: User;
  @Column({ type: 'text' }) body!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

export const entities = [
  User,
  RefreshToken,
  PasswordResetToken,
  Port,
  PortManager,
  PortAvailability,
  PortFacility,
  PortNotice,
  SailingRoute,
  RoutePoint,
  LocationSample,
  TrafficCell,
  Alert,
  Conversation,
  ConversationParticipant,
  Message,
];
