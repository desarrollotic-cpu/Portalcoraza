-- El archivo trae, además de SI/NO y fechas, valores como PDT, SOLICITUD,
-- SE HIZO LA SOLICITUD, PARA FIRMAR, AUTOMATICO, INDEFINIDO, N MESES/AÑOS
-- y fechas mal formateadas. Migramos los BOOLEAN de documentos y los DATE
-- de verificación a VARCHAR para preservar el dato tal cual y no silenciarlo.

BEGIN;

-- Idempotente: solo convierte si el tipo original de 049 sigue vigente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts'
      AND column_name = 'doc_camara_comercio' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE posts
      ALTER COLUMN doc_camara_comercio TYPE VARCHAR(60) USING (
        CASE WHEN doc_camara_comercio IS TRUE THEN 'SI' WHEN doc_camara_comercio IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_rut TYPE VARCHAR(60) USING (
        CASE WHEN doc_rut IS TRUE THEN 'SI' WHEN doc_rut IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_cc_rep_legal TYPE VARCHAR(60) USING (
        CASE WHEN doc_cc_rep_legal IS TRUE THEN 'SI' WHEN doc_cc_rep_legal IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_tratamiento_datos TYPE VARCHAR(60) USING (
        CASE WHEN doc_tratamiento_datos IS TRUE THEN 'SI' WHEN doc_tratamiento_datos IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_formulario_asociado TYPE VARCHAR(60) USING (
        CASE WHEN doc_formulario_asociado IS TRUE THEN 'SI' WHEN doc_formulario_asociado IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_acuerdo_seguridad TYPE VARCHAR(60) USING (
        CASE WHEN doc_acuerdo_seguridad IS TRUE THEN 'SI' WHEN doc_acuerdo_seguridad IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_visita_cliente TYPE VARCHAR(60) USING (
        CASE WHEN doc_visita_cliente IS TRUE THEN 'SI' WHEN doc_visita_cliente IS FALSE THEN 'NO' ELSE NULL END
      ),
      ALTER COLUMN doc_rues_camara TYPE VARCHAR(60) USING (
        CASE WHEN doc_rues_camara IS TRUE THEN 'SI' WHEN doc_rues_camara IS FALSE THEN 'NO' ELSE NULL END
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts'
      AND column_name = 'verif_encuesta_satisfaccion' AND data_type = 'date'
  ) THEN
    ALTER TABLE posts
      ALTER COLUMN verif_encuesta_satisfaccion TYPE VARCHAR(30) USING (verif_encuesta_satisfaccion::text),
      ALTER COLUMN verif_ofac_rl TYPE VARCHAR(30) USING (verif_ofac_rl::text),
      ALTER COLUMN verif_ofac_persona_juridica TYPE VARCHAR(30) USING (verif_ofac_persona_juridica::text),
      ALTER COLUMN verif_central_riesgos_pn TYPE VARCHAR(30) USING (verif_central_riesgos_pn::text),
      ALTER COLUMN verif_central_riesgos_nit TYPE VARCHAR(30) USING (verif_central_riesgos_nit::text),
      ALTER COLUMN verif_procuraduria_nit TYPE VARCHAR(30) USING (verif_procuraduria_nit::text),
      ALTER COLUMN verif_procuraduria_rl TYPE VARCHAR(30) USING (verif_procuraduria_rl::text),
      ALTER COLUMN verif_procuraduria_rls TYPE VARCHAR(30) USING (verif_procuraduria_rls::text),
      ALTER COLUMN verif_procuraduria_rev_fiscal_ppal TYPE VARCHAR(30) USING (verif_procuraduria_rev_fiscal_ppal::text),
      ALTER COLUMN verif_procuraduria_rev_fiscal_sup TYPE VARCHAR(30) USING (verif_procuraduria_rev_fiscal_sup::text),
      ALTER COLUMN verif_procuraduria_miembros_junta TYPE VARCHAR(30) USING (verif_procuraduria_miembros_junta::text),
      ALTER COLUMN verif_policia_rp TYPE VARCHAR(30) USING (verif_policia_rp::text),
      ALTER COLUMN verif_policia_rp_sup TYPE VARCHAR(30) USING (verif_policia_rp_sup::text),
      ALTER COLUMN verif_policia_rev_fiscal TYPE VARCHAR(30) USING (verif_policia_rev_fiscal::text),
      ALTER COLUMN verif_policia_rev_fiscal_sup TYPE VARCHAR(30) USING (verif_policia_rev_fiscal_sup::text),
      ALTER COLUMN verif_policia_miembros_junta TYPE VARCHAR(30) USING (verif_policia_miembros_junta::text),
      ALTER COLUMN verif_contraloria_rp TYPE VARCHAR(30) USING (verif_contraloria_rp::text),
      ALTER COLUMN verif_contraloria_rp_sup TYPE VARCHAR(30) USING (verif_contraloria_rp_sup::text),
      ALTER COLUMN verif_contraloria_rev_fiscal TYPE VARCHAR(30) USING (verif_contraloria_rev_fiscal::text),
      ALTER COLUMN verif_contraloria_rev_fiscal_sup TYPE VARCHAR(30) USING (verif_contraloria_rev_fiscal_sup::text),
      ALTER COLUMN verif_contraloria_miembros_junta TYPE VARCHAR(30) USING (verif_contraloria_miembros_junta::text),
      ALTER COLUMN verif_supersociedades TYPE VARCHAR(30) USING (verif_supersociedades::text);
  END IF;
END $$;

-- Nuevo: preserva TIEMPO DEL CTTO cuando no es fecha (INDEFINIDO, 24 MESES, 2 AÑOS, AUTOMATICO...)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS contract_term VARCHAR(80);

-- Emails múltiples en el archivo (coma/espacio)
ALTER TABLE posts ALTER COLUMN contact_email TYPE TEXT;

COMMIT;
