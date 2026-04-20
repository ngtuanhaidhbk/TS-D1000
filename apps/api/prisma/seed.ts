import { PrismaClient, UserRole, UserStatus, OperationMode, DeviceType, CameraProtocol, CameraStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const userPasswordHash = await bcrypt.hash('User123!', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { username: 'user' },
    update: {
      passwordHash: userPasswordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
    create: {
      username: 'user',
      passwordHash: userPasswordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  const room = await prisma.room.upsert({
    where: { name: 'Main Meeting Room' },
    update: { operationMode: OperationMode.MANUAL },
    create: {
      name: 'Main Meeting Room',
      operationMode: OperationMode.MANUAL,
    },
  });

  const chairmanUnit = await prisma.tsdUnit.create({
    data: {
      roomId: room.id,
      externalUnitId: 'CH-001',
      unitName: 'Chairman Unit',
      deviceType: DeviceType.CHAIRMAN,
    },
  });

  const delegateUnit = await prisma.tsdUnit.create({
    data: {
      roomId: room.id,
      externalUnitId: 'DG-001',
      unitName: 'Delegate Unit 1',
      deviceType: DeviceType.DELEGATE,
    },
  });

  const camera = await prisma.camera.create({
    data: {
      roomId: room.id,
      name: 'Camera 1',
      protocol: CameraProtocol.ONVIF,
      ipAddress: '192.168.1.20',
      port: 80,
      status: CameraStatus.ACTIVE,
      capabilityPtz: true,
      capabilityPreset: true,
      capabilityStream: true,
      vendor: 'Demo Vendor',
      model: 'Demo PTZ',
    },
  });

  const preset = await prisma.cameraPreset.create({
    data: {
      cameraId: camera.id,
      presetCode: 'P01',
      presetName: 'Chairman Preset',
    },
  });

  await prisma.micCameraMapping.create({
    data: {
      roomId: room.id,
      unitId: chairmanUnit.id,
      cameraId: camera.id,
      presetId: preset.id,
      isActive: true,
    },
  });

  await prisma.micCameraMapping.create({
    data: {
      roomId: room.id,
      unitId: delegateUnit.id,
      cameraId: camera.id,
      presetId: preset.id,
      isActive: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
