// Run with: npm run seed
// Populates the database with sample parking areas (with real generated
// spaces), test accounts for every role, and demo data so the app has
// something to show during a presentation.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const ParkingArea = require('./models/ParkingArea');
const ParkingSpace = require('./models/ParkingSpace');
const User = require('./models/User');
const ParkingTransaction = require('./models/ParkingTransaction');
const VisitorTicket = require('./models/VisitorTicket');
const ViolationReport = require('./models/ViolationReport');
const Announcement = require('./models/Announcement');
const Reservation = require('./models/Reservation');
const { slotsFor, generateSpacesForArea } = require('./utils/capacity');

// Capacity is in motorcycle-equivalent slots (car = 2, motorcycle = 1) and
// also equals how many individual ParkingSpace records get generated.
const sampleAreas = [
  { name: 'Building A Ground Floor', code: 'A', location: 'Building A', capacity: 20 },
  { name: 'Building B Basement', code: 'B', location: 'Building B', capacity: 16 },
  { name: 'Gymnasium Lot', code: 'G', location: 'Near Gymnasium', capacity: 12 },
  { name: 'Main Gate Lot', code: 'M', location: 'Main Gate', capacity: 10 },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// Occupies `count` consecutive available spaces in `area`, creates a
// ParkingTransaction for them, and marks them occupied. Returns the
// transaction. Used to seed realistic active/completed demo transactions.
async function seedTransaction({ subjectType, user, visitorTicket, plateNumber, vehicleType, area, entryTime, exitTime, extra = {} }) {
  const count = slotsFor(vehicleType);
  const spaces = await ParkingSpace.find({ area: area._id, status: 'available' }).sort({ index: 1 }).limit(count);
  const status = exitTime ? 'COMPLETED' : 'ACTIVE';

  const transaction = await ParkingTransaction.create({
    subjectType,
    user: user ? user._id : null,
    visitorTicket: visitorTicket ? visitorTicket._id : null,
    plateNumber,
    vehicleType,
    slotEquivalent: count,
    area: area._id,
    spaces: spaces.map((s) => s._id),
    entryTime,
    exitTime: exitTime || null,
    status,
    ...extra,
  });

  await ParkingSpace.updateMany(
    { _id: { $in: spaces.map((s) => s._id) } },
    { status: exitTime ? 'available' : 'occupied', currentTransaction: exitTime ? null : transaction._id }
  );

  return transaction;
}

(async () => {
  try {
    await connectDB();

    // Fresh dev seed: reset everything for a clean, predictable demo.
    await Promise.all([
      ParkingArea.deleteMany({}),
      ParkingSpace.deleteMany({}),
      ParkingTransaction.deleteMany({}),
      VisitorTicket.deleteMany({}),
      ViolationReport.deleteMany({}),
      Announcement.deleteMany({}),
      Reservation.deleteMany({}),
      User.deleteMany({}),
    ]);

    const areas = [];
    for (const a of sampleAreas) {
      const area = await ParkingArea.create(a);
      await generateSpacesForArea(area);
      areas.push(area);
    }
    console.log(`Seeded ${areas.length} parking areas with individually-coded spaces (e.g. A-1..A-20).`);
    const [areaA, areaB, areaGym, areaGate] = areas;

    // ---------- Staff accounts ----------
    const guardPasswordHash = await bcrypt.hash('guard123', 10);
    await User.create({
      surname: 'Guard', givenName: 'Campus', middleName: '',
      studentId: '0000-0001', email: 'guard@tup.edu.ph', contactNumber: '09000000000',
      passwordHash: guardPasswordHash, role: 'guard',
      vehicle: { plateNumber: 'GUARD-01', vehicleType: 'car' },
    });
    console.log('Seeded guard account -> email: guard@tup.edu.ph / password: guard123');

    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await User.create({
      surname: 'Administrator', givenName: 'TUPark', middleName: '',
      studentId: '0000-0002', email: 'admin@tup.edu.ph', contactNumber: '09000000001',
      passwordHash: adminPasswordHash, role: 'admin',
      vehicle: { plateNumber: 'ADMIN-01', vehicleType: 'car' },
    });
    console.log('Seeded admin account -> email: admin@tup.edu.ph / password: admin123');

    const facultyPasswordHash = await bcrypt.hash('faculty123', 10);
    const faculty = await User.create({
      surname: 'Reyes', givenName: 'Professor', middleName: 'D',
      studentId: '0000-0003', email: 'faculty@tup.edu.ph', contactNumber: '09000000002',
      passwordHash: facultyPasswordHash, role: 'faculty',
      vehicle: { plateNumber: 'FAC 0001', vehicleType: 'car' },
    });
    console.log('Seeded faculty account -> email: faculty@tup.edu.ph / password: faculty123');

    // ---------- Demo student accounts ----------
    const studentPasswordHash = await bcrypt.hash('student123', 10);
    const studentSeeds = [
      { surname: 'Cultivo', givenName: 'Justin Kerby', studentId: '2021-00001', plate: 'ABC 1234', vehicleType: 'car' },
      { surname: 'De Jesus', givenName: 'Rhen Lewis', studentId: '2021-00002', plate: 'DEF 5678', vehicleType: 'motorcycle' },
      { surname: 'Embay', givenName: 'Lovely Tracy Mae', studentId: '2021-00003', plate: 'GHI 9012', vehicleType: 'car' },
      { surname: 'Santos', givenName: 'Miguel', studentId: '2021-00004', plate: 'JKL 3456', vehicleType: 'motorcycle' },
    ];

    const students = [];
    for (const s of studentSeeds) {
      const user = await User.create({
        surname: s.surname,
        givenName: s.givenName,
        middleName: '',
        studentId: s.studentId,
        email: `${s.studentId.replace(/[^0-9a-z]/gi, '').toLowerCase()}@tup.edu.ph`,
        contactNumber: '09171234567',
        passwordHash: studentPasswordHash,
        role: 'student',
        vehicle: { plateNumber: s.plate, vehicleType: s.vehicleType },
      });
      students.push(user);
    }
    console.log(`Seeded ${students.length} demo student accounts (password for all: student123).`);
    const [s1, s2, s3, s4] = students;

    // ---------- Demo transactions: 2 active, 2 completed ----------
    await seedTransaction({
      subjectType: 'student', user: s1, plateNumber: s1.vehicle.plateNumber, vehicleType: s1.vehicle.vehicleType,
      area: areaA, entryTime: new Date(Date.now() - 45 * 60 * 1000),
    });
    await seedTransaction({
      subjectType: 'student', user: s2, plateNumber: s2.vehicle.plateNumber, vehicleType: s2.vehicle.vehicleType,
      area: areaB, entryTime: new Date(Date.now() - 20 * 60 * 1000),
      extra: { photoStatus: 'submitted', photoSubmittedAt: new Date() },
    });
    await seedTransaction({
      subjectType: 'student', user: s3, plateNumber: s3.vehicle.plateNumber, vehicleType: s3.vehicle.vehicleType,
      area: areaGym, entryTime: new Date(Date.now() - 3 * 60 * 60 * 1000), exitTime: new Date(Date.now() - 60 * 60 * 1000),
    });
    await seedTransaction({
      subjectType: 'student', user: s4, plateNumber: s4.vehicle.plateNumber, vehicleType: s4.vehicle.vehicleType,
      area: areaGate, entryTime: new Date(Date.now() - 5 * 60 * 60 * 1000), exitTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    });
    console.log('Seeded 4 demo parking transactions (2 active, 2 completed), occupying real named spaces.');

    // ---------- Demo faculty reservation ----------
    const reservedSpace = await ParkingSpace.findOne({ area: areaA._id, status: 'available' }).sort({ index: -1 });
    if (reservedSpace) {
      await Reservation.create({ user: faculty._id, area: areaA._id, space: reservedSpace._id, status: 'ACTIVE' });
      reservedSpace.status = 'reserved';
      await reservedSpace.save();
      console.log(`Seeded 1 active faculty reservation on space ${reservedSpace.code}.`);
    }

    // ---------- Demo visitor tickets (today) ----------
    const visitorTicket1 = await VisitorTicket.create({
      ticketNumber: `VIS-${todayString().replace(/-/g, '')}-001`,
      visitorName: 'Maria Santos', contactNumber: '09181234567',
      plateNumber: 'VIS 1111', vehicleType: 'car',
      dateIssued: todayString(), entryTime: new Date(Date.now() - 30 * 60 * 1000),
      area: areaGate._id, status: 'ACTIVE',
    });
    await seedTransaction({
      subjectType: 'visitor', visitorTicket: visitorTicket1, plateNumber: 'VIS 1111', vehicleType: 'car',
      area: areaGate, entryTime: visitorTicket1.entryTime,
    });

    const visitorTicket2 = await VisitorTicket.create({
      ticketNumber: `VIS-${todayString().replace(/-/g, '')}-002`,
      visitorName: 'Pedro Reyes', contactNumber: '09191234567',
      plateNumber: 'VIS 2222', vehicleType: 'motorcycle',
      dateIssued: todayString(),
      entryTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      exitTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      area: areaGym._id, status: 'COMPLETED',
    });
    await seedTransaction({
      subjectType: 'visitor', visitorTicket: visitorTicket2, plateNumber: 'VIS 2222', vehicleType: 'motorcycle',
      area: areaGym, entryTime: visitorTicket2.entryTime, exitTime: visitorTicket2.exitTime,
    });
    console.log('Seeded 2 demo visitor tickets (1 active, 1 completed).');

    // ---------- Demo violation reports ----------
    await ViolationReport.create({
      reportedBy: s1._id, plateNumber: 'XYZ 9999', area: areaA._id,
      description: 'Vehicle parked across two slots, blocking access.', status: 'Pending',
    });
    await ViolationReport.create({
      reportedBy: s2._id, plateNumber: 'QRS 4444', area: areaB._id,
      description: 'Motorcycle parked in a car slot, wasting capacity.', status: 'Under Review',
    });
    console.log('Seeded 2 demo violation reports.');

    // ---------- Demo announcement ----------
    await Announcement.create({
      title: 'Gymnasium Lot temporary closure',
      area: areaGym._id,
      reason: 'Upcoming intramurals opening ceremony setup.',
      requiredAction: 'Please vacate the Gymnasium Lot by 5:00 PM today.',
      affectedPlateNumbers: ['GHI 9012'],
    });
    console.log('Seeded 1 demo announcement.');

    console.log('\nSeed complete. Register additional real student accounts through the app to keep demoing the QR/entry flow.');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit();
  }
})();
