-- Alta de asociado: solo cédula, nombre y apellido son obligatorios.
ALTER TABLE associates
  ALTER COLUMN birth_date DROP NOT NULL;
