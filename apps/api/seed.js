const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required.');
  process.exit(1);
}
const client = new Client({ connectionString });

client.connect()
  .then(() => client.query(`
    INSERT INTO services (id, name, description, price, duration, category, active, "order", updated_at)
    VALUES 
    (gen_random_uuid()::text, 'Corte Signature', 'Corte de cabello femenino personalizado', 25000, 60, 'PELUQUERIA', true, 1, NOW()),
    (gen_random_uuid()::text, 'Corte Hombre', 'Corte de cabello masculino con perfilado', 15000, 45, 'PELUQUERIA', true, 2, NOW()),
    (gen_random_uuid()::text, 'Uñas Gel', 'Esculpidas en gel con diseño', 28000, 120, 'MANICURIA', true, 3, NOW()),
    (gen_random_uuid()::text, 'Esmaltado Semi', 'Esmaltado semipermanente manos', 18000, 60, 'MANICURIA', true, 4, NOW()),
    (gen_random_uuid()::text, 'Facial Glow', 'Limpieza profunda e hidratación', 35000, 90, 'COSMETOLOGIA', true, 5, NOW()),
    (gen_random_uuid()::text, 'Keratina', 'Alisado con keratina sin formol', 45000, 180, 'PELUQUERIA', true, 6, NOW())
    ON CONFLICT DO NOTHING;
  `))
  .then(() => console.log('Services inserted!'))
  .catch(console.error)
  .finally(() => client.end());
