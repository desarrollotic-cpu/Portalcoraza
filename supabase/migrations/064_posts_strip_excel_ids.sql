-- NIT, cédula y n.º contrato llegaron de Excel como 900123.0
UPDATE posts
SET nit = regexp_replace(trim(nit), '\.0+$', '')
WHERE nit ~ '^[0-9]+\.0+$';

UPDATE posts
SET legal_rep_id = regexp_replace(trim(legal_rep_id), '\.0+$', '')
WHERE legal_rep_id ~ '^[0-9]+\.0+$';

UPDATE posts
SET contract_number = regexp_replace(trim(contract_number), '\.0+$', '')
WHERE contract_number ~ '^[0-9]+\.0+$';

UPDATE post_contracts
SET contract_number = regexp_replace(trim(contract_number), '\.0+$', '')
WHERE contract_number ~ '^[0-9]+\.0+$';

UPDATE post_otrosi
SET number = regexp_replace(trim(number), '\.0+$', '')
WHERE number ~ '^[0-9]+\.0+$';
