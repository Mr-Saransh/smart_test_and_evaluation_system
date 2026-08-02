const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const db = require('../src/config/db');

async function seed() {
  console.log('🚀 Starting Apni Vidya Demo Environment Seed...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Password hashes
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const teacherHash = await bcrypt.hash('Teacher@123', salt);
    const studentHash = await bcrypt.hash('Student@123', salt);
    const parentHash = await bcrypt.hash('Parent@123', salt);

    // 1. Create Admin User (Rahul Sharma)
    console.log(' Creating Admin user...');
    const adminRes = await client.query(
      `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
       VALUES ($1, $2, $3, 'institute_admin', $4, false)
       ON CONFLICT (phone) DO UPDATE SET 
         email = EXCLUDED.email, 
         password_hash = EXCLUDED.password_hash, 
         full_name = EXCLUDED.full_name,
         must_reset_password = false
       RETURNING id`,
      ['9876500001', 'admin@apnividya.demo', adminHash, 'Rahul Sharma']
    );
    const adminId = adminRes.rows[0].id;

    // Generate enrollment QR code base64 image
    const enrollmentUrl = 'http://localhost:5173/enroll/apni-vidya-demo';
    const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });

    // 2. Create Institute (Apni Vidya Coaching Institute - Bhubaneswar, Odisha)
    console.log(' Creating Institute (Bhubaneswar, Odisha) with QR Data...');
    const instRes = await client.query(
      `INSERT INTO institutes (admin_id, name, address, city, state, pincode, enrollment_slug, qr_code_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (enrollment_slug) DO UPDATE SET name = EXCLUDED.name, admin_id = EXCLUDED.admin_id, city = EXCLUDED.city, state = EXCLUDED.state, qr_code_data = EXCLUDED.qr_code_data
       RETURNING id`,
      [
        adminId,
        'Apni Vidya Coaching Institute',
        '102 Knowledge Park, Jaydev Vihar',
        'Bhubaneswar',
        'Odisha',
        '751013',
        'apni-vidya-demo',
        qrCodeData
      ]
    );
    const instId = instRes.rows[0].id;

    // 3. Create Primary Teacher (Priya Verma - Physics) + extra teachers
    console.log(' Creating Teachers...');
    const teacherData = [
      { name: 'Priya Verma', email: 'teacher@apnividya.demo', phone: '9876500002', subject: 'Physics' },
      { name: 'Ramesh Kumar', email: 'ramesh.teacher@apnividya.demo', phone: '9876500021', subject: 'Chemistry' }
    ];

    const teacherUserIds = [];
    for (const t of teacherData) {
      const tUser = await client.query(
        `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, $3, 'teacher', $4, false)
         ON CONFLICT (phone) DO UPDATE SET 
           email = EXCLUDED.email, 
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           must_reset_password = false
         RETURNING id`,
        [t.phone, t.email, teacherHash, t.name]
      );
      const tuId = tUser.rows[0].id;
      teacherUserIds.push(tuId);

      await client.query(
        `INSERT INTO teachers (user_id, institute_id, subject)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, institute_id) DO UPDATE SET subject = EXCLUDED.subject`,
        [tuId, instId, t.subject]
      );
    }

    // 4. Create Batches
    console.log(' Creating Batches...');
    const b1Res = await client.query(
      `INSERT INTO batches (institute_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [instId, 'Class 12 Science NEET/JEE', 'Intensive JEE & NEET preparation cohort']
    );
    const b1Id = b1Res.rows[0].id;

    // 5. Create Courses
    console.log(' Creating Courses...');
    const courses = [
      { name: 'Class 12 Science', sub: 'Physics, Chemistry, Maths & Bio', fee: 85000, batch: b1Id }
    ];
    for (const c of courses) {
      await client.query(
        `INSERT INTO courses (institute_id, batch_id, name, description, fee_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [instId, c.batch, c.name, `Complete syllabus for ${c.sub}`, c.fee]
      );
    }

    // 6. Create Parent (Rajesh Patel)
    console.log(' Creating Parent account (Rajesh Patel)...');
    const parentRes = await client.query(
      `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
       VALUES ($1, $2, $3, 'parent', $4, false)
       ON CONFLICT (phone) DO UPDATE SET 
         email = EXCLUDED.email, 
         password_hash = EXCLUDED.password_hash, 
         full_name = EXCLUDED.full_name,
         must_reset_password = false
       RETURNING id`,
      ['9876500004', 'parent@apnividya.demo', parentHash, 'Rajesh Patel']
    );
    const parentUserId = parentRes.rows[0].id;

    // 7. Create Primary Student (Aarav Patel) linked to Parent
    console.log(' Creating Primary Student (Aarav Patel)...');
    const studentRes = await client.query(
      `INSERT INTO users (phone, email, password_hash, role, full_name, must_reset_password)
       VALUES ($1, $2, $3, 'student', $4, false)
       ON CONFLICT (phone) DO UPDATE SET 
         email = EXCLUDED.email, 
         password_hash = EXCLUDED.password_hash, 
         full_name = EXCLUDED.full_name,
         must_reset_password = false
       RETURNING id`,
      ['9876500003', 'student@apnividya.demo', studentHash, 'Aarav Patel']
    );
    const primaryStudentUserId = studentRes.rows[0].id;

    const aaravStudentRes = await client.query(
      `INSERT INTO students (user_id, institute_id, batch_id, parent_user_id, roll_number)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, institute_id) DO UPDATE SET batch_id = EXCLUDED.batch_id, parent_user_id = EXCLUDED.parent_user_id
       RETURNING id`,
      [primaryStudentUserId, instId, b1Id, parentUserId, '12S-001']
    );
    const aaravStudentId = aaravStudentRes.rows[0].id;

    // 8. Create Additional Demo Students
    console.log(' Creating Demo Students (Riya Sharma)...');
    const studentList = [
      { name: 'Riya Sharma', phone: '9876500101', batch: b1Id, roll: '12S-002' }
    ];

    const allStudentIds = [{ id: aaravStudentId, batch_id: b1Id }];

    for (const s of studentList) {
      const uRes = await client.query(
        `INSERT INTO users (phone, password_hash, role, full_name, must_reset_password)
         VALUES ($1, $2, 'student', $3, false)
         ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [s.phone, studentHash, s.name]
      );
      const stRes = await client.query(
        `INSERT INTO students (user_id, institute_id, batch_id, roll_number)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, institute_id) DO UPDATE SET batch_id = EXCLUDED.batch_id
         RETURNING id`,
        [uRes.rows[0].id, instId, s.batch, s.roll]
      );
      allStudentIds.push({ id: stRes.rows[0].id, batch_id: s.batch });
    }

    // 9. Generate 5 Days Attendance Records (Aarav ~88%)
    console.log(' Generating 5 Days Attendance Records...');
    const today = new Date();
    for (let d = 0; d < 5; d++) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() - d);
      if (dateObj.getDay() === 0) continue; // skip Sundays
      const dateStr = dateObj.toISOString().slice(0, 10);

      for (const st of allStudentIds) {
        const isAarav = st.id === aaravStudentId;
        const rand = Math.random();
        const status = isAarav ? (rand > 0.12 ? 'present' : 'absent') : (rand > 0.15 ? 'present' : 'absent');
        await client.query(
          `INSERT INTO attendance (institute_id, batch_id, student_id, date, status, marked_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (student_id, date) DO NOTHING`,
          [instId, st.batch_id, st.id, dateStr, status, teacherUserIds[0]]
        );
      }
    }

    // 10. Questions Bank & Tests Data (Physics, Chemistry, Maths)
    console.log(' Creating Questions & Test Results...');
    const questionsData = [
      { sub: 'Physics', topic: 'Mechanics', text: 'What is the SI unit of Force?', opts: ['Newton', 'Joule', 'Watt', 'Pascal'], corr: 0, marks: 50 },
      { sub: 'Chemistry', topic: 'Organic Chemistry', text: 'Which functional group is present in Alcohols?', opts: ['-OH', '-COOH', '-CHO', '-NH2'], corr: 0, marks: 50 }
    ];

    const qIds = [];
    for (const q of questionsData) {
      const qRes = await client.query(
        `INSERT INTO questions (institute_id, created_by, subject, topic, type, text, options, correct_index, marks)
         VALUES ($1, $2, $3, $4, 'mcq', $5, $6, $7, $8)
         RETURNING id`,
        [instId, teacherUserIds[0], q.sub, q.topic, q.text, JSON.stringify(q.opts), q.corr, q.marks]
      );
      qIds.push({ id: qRes.rows[0].id, sub: q.sub });
    }

    const testList = [
      { title: 'Physics Weekly Test', sub: 'Physics', batch: b1Id, aaravScore: 48 },
      { title: 'Chemistry Chapter Test', sub: 'Chemistry', batch: b1Id, aaravScore: 42 },
      { title: 'Mathematics Practice Test', sub: 'Mathematics', batch: b1Id, aaravScore: 45 }
    ];

    for (const t of testList) {
      const tRes = await client.query(
        `INSERT INTO tests (institute_id, batch_id, created_by, title, subject, duration_min, total_marks, status)
         VALUES ($1, $2, $3, $4, $5, 45, 50, 'completed')
         RETURNING id`,
        [instId, t.batch, teacherUserIds[0], t.title, t.sub]
      );
      const testId = tRes.rows[0].id;

      // Add submissions
      const batchStudents = allStudentIds.filter(s => s.batch_id === t.batch);
      let rankCounter = 1;
      for (const st of batchStudents) {
        const isAarav = st.id === aaravStudentId;
        const score = isAarav ? t.aaravScore : Math.floor(Math.random() * 15) + 30;
        await client.query(
          `INSERT INTO test_submissions (test_id, student_id, answers, score, max_marks, rank)
           VALUES ($1, $2, $3, $4, 50, $5)
           ON CONFLICT (test_id, student_id) DO NOTHING`,
          [testId, st.id, JSON.stringify({ q1: 0 }), score, isAarav ? 1 : ++rankCounter]
        );
      }
    }

    // 11. Study Materials Data
    console.log(' Uploading Study Materials...');
    const materials = [
      { title: 'Mechanics Notes PDF', sub: 'Physics', kind: 'pdf', url: 'https://example.com/mechanics-notes.pdf', batch: b1Id },
      { title: 'Organic Chemistry Notes', sub: 'Chemistry', kind: 'note', url: 'https://example.com/organic-chem.pdf', batch: b1Id },
      { title: 'Integration Worksheet', sub: 'Mathematics', kind: 'pdf', url: 'https://example.com/integration-worksheet.pdf', batch: b1Id }
    ];

    for (const m of materials) {
      await client.query(
        `INSERT INTO study_materials (institute_id, batch_id, created_by, title, subject, kind, url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [instId, m.batch, teacherUserIds[0], m.title, m.sub, m.kind, m.url]
      );
    }

    // 12. Fee Structures & Payment Records (Aarav: Paid 60,000 / Total 85,000)
    console.log(' Generating Fee Structures & Payment Ledger...');
    const fsRes = await client.query(
      `INSERT INTO fee_structures (institute_id, batch_id, title, total_amount, due_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE + INTERVAL '15 days')
       RETURNING id`,
      [instId, b1Id, 'Class 12 Science Total Course Fee', 85000]
    );
    const fsId = fsRes.rows[0].id;

    // Aarav Patel fee record
    await client.query(
      `INSERT INTO fee_records (fee_structure_id, student_id, amount_due, amount_paid, status, due_date)
       VALUES ($1, $2, 85000, 60000, 'partial', CURRENT_DATE + INTERVAL '15 days')
       ON CONFLICT (fee_structure_id, student_id) DO NOTHING`,
      [fsId, aaravStudentId]
    );

    // Other students fee records
    const b1Students = allStudentIds.filter(s => s.batch_id === b1Id && s.id !== aaravStudentId);
    for (const st of b1Students) {
      await client.query(
        `INSERT INTO fee_records (fee_structure_id, student_id, amount_due, amount_paid, status, due_date)
         VALUES ($1, $2, 85000, 85000, 'paid', CURRENT_DATE + INTERVAL '15 days')
         ON CONFLICT (fee_structure_id, student_id) DO NOTHING`,
        [fsId, st.id]
      );
    }

    // 13. Timetable Slots (Mon-Sat 10:00 AM Physics, Class 12 Science, Room 101, Priya Verma)
    console.log(' Adding Weekly Timetable Slots...');
    for (let day = 0; day < 6; day++) {
      await client.query(
        `INSERT INTO timetable_slots (institute_id, batch_id, day_of_week, start_time, end_time, subject, room)
         VALUES ($1, $2, $3, '10:00', '11:00', 'Physics', 'Room 101')`,
        [instId, b1Id, day]
      );
    }

    // 14. Broadcast Announcements
    console.log(' Broadcasting Institute Announcements...');
    const announcements = [
      { title: 'Weekly Test Schedule Published', body: 'Physics, Chemistry & Mathematics weekly evaluation test papers are scheduled for Friday 10:00 AM.' },
      { title: 'Holiday Notice - National Day', body: 'The institute will remain closed on Friday for National Holiday. Online study material is available in student portal.' },
      { title: 'New Study Material Uploaded', body: 'Mechanics & Organic Chemistry chapter revision worksheets are now available in your materials section.' },
      { title: 'Parent-Teacher Meeting Scheduled', body: 'Parent meeting scheduled for Saturday at 4:00 PM to discuss Term 1 academic progress and attendance.' }
    ];

    for (const a of announcements) {
      await client.query(
        `INSERT INTO announcements (institute_id, created_by, title, body, audience)
         VALUES ($1, $2, $3, $4, 'all')`,
        [instId, adminId, a.title, a.body]
      );
    }

    await client.query('COMMIT');
    console.log('\n✅ Apni Vidya Demo Database Seeded Successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
