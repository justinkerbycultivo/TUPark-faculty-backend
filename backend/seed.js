// Run with: npm run seed
// Resets every collection and populates TUPark with realistic demo data:
// parking areas + their generated spaces, one guard/admin/faculty account,
// four demo students, visitor tickets, violation reports, an announcement,
// a faculty reservation, and a small campus navigation graph.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const ParkingArea = require('./models/ParkingArea');
const ParkingSpace = require('./models/ParkingSpace');
const ParkingTransaction = require('./models/ParkingTransaction');
const VisitorTicket = require('./models/VisitorTicket');
const ViolationReport = require('./models/ViolationReport');
const Announcement = require('./models/Announcement');
const Reservation = require('./models/Reservation');
const CampusNode = require('./models/CampusNode');
const CampusEdge = require('./models/CampusEdge');

const { generateSpacesForArea, markSpacesOccupied } = require('./utils/capacity');
const { nextTicketNumber, todayISODate } = require('./utils/ticketNumber');

async function run() {
  await connectDB();

  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    ParkingArea.deleteMany({}),
    ParkingSpace.deleteMany({}),
    ParkingTransaction.deleteMany({}),
    VisitorTicket.deleteMany({}),
    ViolationReport.deleteMany({}),
    Announcement.deleteMany({}),
    Reservation.deleteMany({}),
    CampusNode.deleteMany({}),
    CampusEdge.deleteMany({}),
  ]);

  // ---- Parking areas + generated spaces ----------------------------------
  console.log('Creating parking areas...');
  const areaDefs = [
    { name: 'Area A - Main Student Parking', code: 'A', location: 'Near the Main Gate', capacity: 20 },
    { name: 'Area B - Faculty Parking', code: 'B', location: 'Beside the Administration Building', capacity: 12 },
    { name: 'Area G - Gymnasium Lot', code: 'G', location: 'Behind the Gymnasium', capacity: 15 },
    { name: 'Area M - Motorcycle Parking', code: 'M', location: 'Covered area near the Library', capacity: 25 },
  ];

  const areas = {};
  for (const def of areaDefs) {
    const area = await ParkingArea.create(def);
    await generateSpacesForArea(area);
    areas[def.code] = area;
  }

  // ---- Accounts -----------------------------------------------------------
  console.log('Creating accounts...');

  async function hash(pw) {
    return bcrypt.hash(pw, 10);
  }

  const guard = await User.create({
    surname: 'Santos',
    givenName: 'Ramon',
    middleName: '',
    studentId: '0000-0001',
    email: 'guard@tup.edu.ph',
    contactNumber: '09171234567',
    passwordHash: await hash('guard123'),
    role: 'guard',
    agreedToTerms: true,
  });

  const admin = await User.create({
    surname: 'Reyes',
    givenName: 'Angela',
    middleName: '',
    studentId: '0000-0002',
    email: 'admin@tup.edu.ph',
    contactNumber: '09171234568',
    passwordHash: await hash('admin123'),
    role: 'admin',
    agreedToTerms: true,
  });

  const faculty = await User.create({
    surname: 'Garcia',
    givenName: 'Michael',
    middleName: 'Dela Cruz',
    studentId: '0000-0003',
    email: 'faculty@tup.edu.ph',
    contactNumber: '09171234569',
    passwordHash: await hash('faculty123'),
    role: 'faculty',
    vehicle: { plateNumber: 'FAC-1001', vehicleType: 'car' },
    agreedToTerms: true,
  });

  const studentDefs = [
    {
      surname: 'Cultivo',
      givenName: 'Justin Kerby',
      middleName: 'R.',
      studentId: '2023-00123',
      email: 'justinkerby.cultivo@gsfe.tupcavite.edu.ph',
      contactNumber: '09171111111',
      vehicle: { plateNumber: 'STU-1001', vehicleType: 'motorcycle' },
      activeParking: { areaCode: 'M' },
    },
    {
      surname: 'De Jesus',
      givenName: 'Rhen Lewis',
      middleName: 'N.',
      studentId: '2023-00124',
      email: 'rhenlewis.dejesus@gsfe.tupcavite.edu.ph',
      contactNumber: '09171111112',
      vehicle: { plateNumber: 'STU-1002', vehicleType: 'car' },
      activeParking: { areaCode: 'A' },
    },
    {
      surname: 'Embay',
      givenName: 'Lovely Tracy Mae',
      middleName: '',
      studentId: '2023-00125',
      email: 'lovelytracymae.embay@gsfe.tupcavite.edu.ph',
      contactNumber: '09171111113',
      vehicle: { plateNumber: 'STU-1003', vehicleType: 'bicycle' },
      activeParking: null,
    },
    {
      surname: 'Ramos',
      givenName: 'Kevin',
      middleName: 'A.',
      studentId: '2023-00126',
      email: 'kevin.ramos@gsfe.tupcavite.edu.ph',
      contactNumber: '09171111114',
      vehicle: { plateNumber: 'STU-1004', vehicleType: 'electric_scooter' },
      activeParking: null,
    },
  ];

  const students = [];
  for (const def of studentDefs) {
    const student = await User.create({
      surname: def.surname,
      givenName: def.givenName,
      middleName: def.middleName,
      studentId: def.studentId,
      email: def.email,
      contactNumber: def.contactNumber,
      passwordHash: await hash('student123'),
      role: 'student',
      vehicle: def.vehicle,
      agreedToTerms: true,
    });
    students.push({ user: student, def });
  }

  // ---- Parking transactions (2 active, 2 completed/historical) -----------
  console.log('Creating parking transactions...');

  async function pickFreeSpaces(areaCode, count) {
    return ParkingSpace.find({ area: areas[areaCode]._id, status: 'available' }).sort({ index: 1 }).limit(count);
  }

  const { slotsFor } = require('./utils/capacity');

  for (const { user, def } of students) {
    if (def.activeParking) {
      const slots = slotsFor(def.vehicle.vehicleType);
      const spaces = await pickFreeSpaces(def.activeParking.areaCode, slots);
      const transaction = await ParkingTransaction.create({
        subjectType: 'student',
        user: user._id,
        plateNumber: def.vehicle.plateNumber,
        vehicleType: def.vehicle.vehicleType,
        slotEquivalent: slots,
        area: areas[def.activeParking.areaCode]._id,
        spaces: spaces.map((s) => s._id),
        entryTime: new Date(Date.now() - 1000 * 60 * 45),
        status: 'ACTIVE',
      });
      await markSpacesOccupied(
        spaces.map((s) => s._id),
        transaction._id
      );
    } else {
      // Historical, completed transaction for the other two students.
      const slots = slotsFor(def.vehicle.vehicleType);
      const spaces = await pickFreeSpaces('G', slots);
      const spaceIds = spaces.map((s) => s._id);
      await ParkingTransaction.create({
        subjectType: 'student',
        user: user._id,
        plateNumber: def.vehicle.plateNumber,
        vehicleType: def.vehicle.vehicleType,
        slotEquivalent: slots,
        area: areas.G._id,
        spaces: spaceIds,
        entryTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
        exitTime: new Date(Date.now() - 1000 * 60 * 60 * 20),
        status: 'COMPLETED',
        photoStatus: 'submitted',
        photoSubmittedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
      });
      // Spaces stay 'available' for a completed/historical transaction.
    }
  }

  // ---- Faculty reservation -------------------------------------------------
  console.log('Creating faculty reservation...');
  const reservedSpace = await ParkingSpace.findOne({ area: areas.B._id, status: 'available' }).sort({ index: 1 });
  reservedSpace.status = 'reserved';
  await reservedSpace.save();
  await Reservation.create({
    user: faculty._id,
    area: areas.B._id,
    space: reservedSpace._id,
    status: 'ACTIVE',
  });

  // ---- Visitor tickets ------------------------------------------------------
  console.log('Creating visitor tickets...');
  const activeTicketSpaces = await pickFreeSpaces('A', 1);
  const activeTicketNumber = await nextTicketNumber();
  const activeTicket = await VisitorTicket.create({
    ticketNumber: activeTicketNumber,
    visitorName: 'Maria Lopez',
    contactNumber: '09179998888',
    plateNumber: 'VIS-2001',
    vehicleType: 'car',
    dateIssued: todayISODate(),
    entryTime: new Date(Date.now() - 1000 * 60 * 20),
    area: areas.A._id,
    status: 'ACTIVE',
  });
  const activeTicketTransaction = await ParkingTransaction.create({
    subjectType: 'visitor',
    visitorTicket: activeTicket._id,
    plateNumber: 'VIS-2001',
    vehicleType: 'car',
    slotEquivalent: slotsFor('car'),
    area: areas.A._id,
    spaces: activeTicketSpaces.map((s) => s._id),
    entryTime: activeTicket.entryTime,
    status: 'ACTIVE',
  });
  await markSpacesOccupied(
    activeTicketSpaces.map((s) => s._id),
    activeTicketTransaction._id
  );

  const completedTicketNumber = await nextTicketNumber();
  await VisitorTicket.create({
    ticketNumber: completedTicketNumber,
    visitorName: 'Carlos Dizon',
    contactNumber: '09179997777',
    plateNumber: 'VIS-2002',
    vehicleType: 'motorcycle',
    dateIssued: todayISODate(),
    entryTime: new Date(Date.now() - 1000 * 60 * 60 * 3),
    exitTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    area: areas.M._id,
    status: 'COMPLETED',
  });

  // ---- Violation reports ------------------------------------------------
  console.log('Creating violation reports...');
  await ViolationReport.create({
    reportedBy: students[0].user._id,
    plateNumber: 'XYZ-9999',
    area: areas.A._id,
    description: 'Vehicle parked across two spaces, blocking an adjacent slot.',
    status: 'Pending',
  });
  await ViolationReport.create({
    reportedBy: guard._id,
    plateNumber: 'ABC-1234',
    area: areas.G._id,
    description: 'Vehicle parked in a motorcycle-only area.',
    status: 'Under Review',
  });

  // ---- Announcement -------------------------------------------------------
  console.log('Creating announcement...');
  await Announcement.create({
    title: 'Area G temporary closure for maintenance',
    area: areas.G._id,
    reason: 'Scheduled pavement maintenance.',
    requiredAction: 'Please move your vehicle to Area A by 5:00 PM today.',
    affectedPlateNumbers: [],
  });

  // ---- Campus navigation graph (schematic, NOT surveyed GPS data) ---------
  console.log('Creating campus navigation graph (approximate schematic layout)...');

  const nodeDefs = [
    { key: 'GATE_MAIN', label: 'Main Gate', type: 'entrance', x: 0, y: 0 },
    { key: 'JUNCTION_1', label: 'Main Walkway Junction', type: 'intersection', x: 20, y: 0 },
    { key: 'AREA_A_ENTRANCE', label: 'Area A Entrance', type: 'area_entrance', areaCode: 'A', x: 30, y: 10 },
    { key: 'AREA_B_ENTRANCE', label: 'Area B Entrance', type: 'area_entrance', areaCode: 'B', x: 40, y: -10 },
    { key: 'JUNCTION_2', label: 'Gymnasium Walkway Junction', type: 'intersection', x: 20, y: 20 },
    { key: 'AREA_G_ENTRANCE', label: 'Area G Entrance', type: 'area_entrance', areaCode: 'G', x: 35, y: 30 },
    { key: 'AREA_M_ENTRANCE', label: 'Area M Entrance', type: 'area_entrance', areaCode: 'M', x: 10, y: 15 },
  ];

  const nodesByKey = {};
  for (const def of nodeDefs) {
    const areaRef = def.areaCode ? areas[def.areaCode]._id : null;
    const node = await CampusNode.create({
      key: def.key,
      label: def.label,
      type: def.type,
      areaRef,
      x: def.x,
      y: def.y,
    });
    nodesByKey[def.key] = node;
  }

  const edgeDefs = [
    { from: 'GATE_MAIN', to: 'JUNCTION_1', distance: 20, instructions: 'Walk straight from the Main Gate toward the main walkway.' },
    { from: 'JUNCTION_1', to: 'AREA_A_ENTRANCE', distance: 12, instructions: 'Turn right toward Area A (Main Student Parking).' },
    { from: 'JUNCTION_1', to: 'AREA_B_ENTRANCE', distance: 18, instructions: 'Continue past the Administration Building to Area B (Faculty Parking).' },
    { from: 'JUNCTION_1', to: 'JUNCTION_2', distance: 22, instructions: 'Turn left toward the Gymnasium walkway.' },
    { from: 'JUNCTION_2', to: 'AREA_G_ENTRANCE', distance: 14, instructions: 'Proceed to Area G, behind the Gymnasium.' },
    { from: 'JUNCTION_2', to: 'AREA_M_ENTRANCE', distance: 10, instructions: 'Head to the covered Area M, near the Library.' },
  ];

  for (const def of edgeDefs) {
    await CampusEdge.create({
      from: nodesByKey[def.from]._id,
      to: nodesByKey[def.to]._id,
      distance: def.distance,
      bidirectional: true,
      instructions: def.instructions,
    });
  }

  console.log('\nSeed complete. Summary:');
  console.log(`  Parking areas: ${Object.keys(areas).length} (A, B, G, M), with generated ParkingSpace docs`);
  console.log('  Accounts:');
  console.log('    guard@tup.edu.ph / guard123');
  console.log('    admin@tup.edu.ph / admin123');
  console.log('    faculty@tup.edu.ph / faculty123 (has 1 active reservation in Area B)');
  for (const { def } of students) {
    console.log(`    ${def.email} / student123 (${def.vehicle.vehicleType}, plate ${def.vehicle.plateNumber})`);
  }
  console.log('  2 visitor tickets (1 active in Area A, 1 completed), 2 violation reports, 1 announcement');
  console.log('  Campus navigation graph: 7 nodes, 6 edges (approximate schematic layout, not surveyed GPS)');
}

run()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
