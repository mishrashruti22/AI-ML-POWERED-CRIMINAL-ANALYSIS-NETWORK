#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/091ff32a77c6baede1ad70c56b00ff90bfec366276f6c6a2035ef5effec6d82c/contract';
import endContract from '../../snapshots/091ff32a77c6baede1ad70c56b00ff90bfec366276f6c6a2035ef5effec6d82c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'callRecord',
        columns: [
          col('callDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('callerPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('caseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('durationSeconds', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receiverPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'case',
        columns: [
          col('caseNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdById', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priority', 'text', {
            notNull: true,
            default: lit('MEDIUM'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'community',
        columns: [
          col('caseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('communityName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('communityNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'communityMember',
        columns: [
          col('communityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'entity',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityValue', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('normalizedValue', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'entityScore',
        columns: [
          col('betweennessScore', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('degreeScore', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('influenceScore', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('rank', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'explanation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('explanationText', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('explanationType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('predictionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('supportingData', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'financialTransaction',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('caseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('receiver', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sender', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('transactionDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('transactionReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'firRecord',
        columns: [
          col('caseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('incidentDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sourceFile', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'prediction',
        columns: [
          col('caseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityAId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityBId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('predictionMethod', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('predictionScore', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PREDICTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'recordEntity',
        columns: [
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'relationship',
        columns: [
          col('confidenceScore', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityAId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityBId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('relationshipType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceRecordId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('weight', 'float8', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'suspiciousPattern',
        columns: [
          col('caseId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('detectedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('entityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('patternType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('severity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailVerified', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('INVESTIGATOR'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'case',
        constraint: 'case_caseNumber_key',
        columns: ['caseNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'communityMember',
        constraint: 'communityMember_communityId_entityId_key',
        columns: ['communityId', 'entityId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'recordEntity',
        constraint: 'recordEntity_recordId_entityId_key',
        columns: ['recordId', 'entityId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_departmentId_key',
        columns: ['departmentId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'callRecord',
        index: 'callRecord_caseId_idx_f7093793',
        columns: ['caseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'case',
        index: 'case_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'community',
        index: 'community_caseId_idx_f7093793',
        columns: ['caseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'communityMember',
        index: 'communityMember_communityId_idx_e2c72225',
        columns: ['communityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'communityMember',
        index: 'communityMember_entityId_idx_18814ca5',
        columns: ['entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'entityScore',
        index: 'entityScore_entityId_idx_18814ca5',
        columns: ['entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'explanation',
        index: 'explanation_entityId_idx_18814ca5',
        columns: ['entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'explanation',
        index: 'explanation_predictionId_idx_95fca695',
        columns: ['predictionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'financialTransaction',
        index: 'financialTransaction_caseId_idx_f7093793',
        columns: ['caseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'firRecord',
        index: 'firRecord_caseId_idx_f7093793',
        columns: ['caseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prediction',
        index: 'prediction_caseId_idx_f7093793',
        columns: ['caseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prediction',
        index: 'prediction_entityAId_idx_1fa1f50c',
        columns: ['entityAId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prediction',
        index: 'prediction_entityBId_idx_9512ec1c',
        columns: ['entityBId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recordEntity',
        index: 'recordEntity_entityId_idx_18814ca5',
        columns: ['entityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'relationship',
        index: 'relationship_entityAId_idx_1fa1f50c',
        columns: ['entityAId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'relationship',
        index: 'relationship_entityBId_idx_9512ec1c',
        columns: ['entityBId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'suspiciousPattern',
        index: 'suspiciousPattern_caseId_idx_f7093793',
        columns: ['caseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'suspiciousPattern',
        index: 'suspiciousPattern_entityId_idx_18814ca5',
        columns: ['entityId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'callRecord',
        foreignKey: {
          name: 'callRecord_caseId_fkey',
          columns: ['caseId'],
          references: { schema: 'public', table: 'case', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'case',
        foreignKey: {
          name: 'case_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'community',
        foreignKey: {
          name: 'community_caseId_fkey',
          columns: ['caseId'],
          references: { schema: 'public', table: 'case', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'communityMember',
        foreignKey: {
          name: 'communityMember_communityId_fkey',
          columns: ['communityId'],
          references: { schema: 'public', table: 'community', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'communityMember',
        foreignKey: {
          name: 'communityMember_entityId_fkey',
          columns: ['entityId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'entityScore',
        foreignKey: {
          name: 'entityScore_entityId_fkey',
          columns: ['entityId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'explanation',
        foreignKey: {
          name: 'explanation_entityId_fkey',
          columns: ['entityId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'explanation',
        foreignKey: {
          name: 'explanation_predictionId_fkey',
          columns: ['predictionId'],
          references: { schema: 'public', table: 'prediction', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'financialTransaction',
        foreignKey: {
          name: 'financialTransaction_caseId_fkey',
          columns: ['caseId'],
          references: { schema: 'public', table: 'case', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'firRecord',
        foreignKey: {
          name: 'firRecord_caseId_fkey',
          columns: ['caseId'],
          references: { schema: 'public', table: 'case', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prediction',
        foreignKey: {
          name: 'prediction_caseId_fkey',
          columns: ['caseId'],
          references: { schema: 'public', table: 'case', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prediction',
        foreignKey: {
          name: 'prediction_entityAId_fkey',
          columns: ['entityAId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prediction',
        foreignKey: {
          name: 'prediction_entityBId_fkey',
          columns: ['entityBId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recordEntity',
        foreignKey: {
          name: 'recordEntity_entityId_fkey',
          columns: ['entityId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'relationship',
        foreignKey: {
          name: 'relationship_entityAId_fkey',
          columns: ['entityAId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'relationship',
        foreignKey: {
          name: 'relationship_entityBId_fkey',
          columns: ['entityBId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'suspiciousPattern',
        foreignKey: {
          name: 'suspiciousPattern_caseId_fkey',
          columns: ['caseId'],
          references: { schema: 'public', table: 'case', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'suspiciousPattern',
        foreignKey: {
          name: 'suspiciousPattern_entityId_fkey',
          columns: ['entityId'],
          references: { schema: 'public', table: 'entity', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
