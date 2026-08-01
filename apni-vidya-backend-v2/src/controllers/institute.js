const db = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = uuidv4().slice(0, 6);
  return `${base}-${suffix}`;
}

async function create(req, res, next) {
  try {
    const { name, address, city, state, pincode } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Institute name is required' });
    }

    const slug = generateSlug(name);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const enrollmentUrl = `${frontendUrl}/enroll/${slug}`;
    const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });

    const result = await db.query(
      `INSERT INTO institutes (admin_id, name, address, city, state, pincode, enrollment_slug, qr_code_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, name, address || null, city || null, state || null, pincode || null, slug, qrCodeData]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getMyInstitute(req, res, next) {
  try {
    const result = await db.query(
      'SELECT * FROM institutes WHERE admin_id = $1 AND is_active = true',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No institute found' });
    }
    const inst = result.rows[0];

    // Lazy generate QR code if missing in database
    if (!inst.qr_code_data && inst.enrollment_slug) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const enrollmentUrl = `${frontendUrl}/enroll/${inst.enrollment_slug}`;
      const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });
      await db.query('UPDATE institutes SET qr_code_data = $1 WHERE id = $2', [qrCodeData, inst.id]);
      inst.qr_code_data = qrCodeData;
    }

    res.json(inst);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, address, city, state, pincode } = req.body;

    const institute = await db.query(
      'SELECT * FROM institutes WHERE id = $1 AND admin_id = $2',
      [id, req.user.id]
    );
    if (institute.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const instRow = institute.rows[0];
    let qrCodeData = instRow.qr_code_data;
    if (!qrCodeData && instRow.enrollment_slug) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const enrollmentUrl = `${frontendUrl}/enroll/${instRow.enrollment_slug}`;
      qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });
    }

    const result = await db.query(
      `UPDATE institutes 
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           city = COALESCE($3, city),
           state = COALESCE($4, state),
           pincode = COALESCE($5, pincode),
           qr_code_data = COALESCE($6, qr_code_data),
           updated_at = now()
       WHERE id = $7 AND admin_id = $8
       RETURNING *`,
      [name, address, city, state, pincode, qrCodeData, id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function regenerateQR(req, res, next) {
  try {
    const { id } = req.params;

    const institute = await db.query(
      'SELECT * FROM institutes WHERE id = $1 AND admin_id = $2',
      [id, req.user.id]
    );
    if (institute.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const enrollmentUrl = `${frontendUrl}/enroll/${institute.rows[0].enrollment_slug}`;
    const qrCodeData = await QRCode.toDataURL(enrollmentUrl, { width: 400, margin: 2 });

    await db.query(
      'UPDATE institutes SET qr_code_data = $1, updated_at = now() WHERE id = $2',
      [qrCodeData, id]
    );

    res.json({ qr_code_data: qrCodeData, enrollment_url: enrollmentUrl });
  } catch (err) {
    next(err);
  }
}

async function getBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const result = await db.query(
      'SELECT id, name, logo_url, city, state FROM institutes WHERE enrollment_slug = $1 AND is_active = true',
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    const batches = await db.query(
      'SELECT id, name, description FROM batches WHERE institute_id = $1 AND is_active = true',
      [result.rows[0].id]
    );

    res.json({
      institute: result.rows[0],
      batches: batches.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getMyInstitute, update, regenerateQR, getBySlug };
