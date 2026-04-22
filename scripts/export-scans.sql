-- Read-only export of Fibroscan scan rows for patients with >=2 valid readings.
-- Pipe into `jq -s '.'` to wrap as a JSON array:
--   mysql ... < export-scans.sql | jq -s '.' > src/data/scans.json
--
-- ALL STATEMENTS BELOW ARE SELECT ONLY. No DDL, DML, or admin verbs.

WITH scans AS (
  SELECT
    patient_contact_number AS pm,
    name,
    doctor_id,
    CASE
      WHEN machine_id IN ('01','1') THEN '01'
      WHEN machine_id IN ('02','2') THEN '02'
      WHEN machine_id IN ('03','3') THEN '03'
      WHEN machine_id IN ('04','4') THEN '04'
      WHEN machine_id IN ('05','5') THEN '05'
      WHEN machine_id IN ('06','6') THEN '06'
      WHEN machine_id IN ('07','7') THEN '07'
      WHEN machine_id IN ('08','8') THEN '08'
      WHEN machine_id IN ('09','9') THEN '09'
      ELSE machine_id
    END AS machine_id,
    DATE(created_at) AS scan_date,
    created_at,
    CAST(NULLIF(REGEXP_REPLACE(JSON_UNQUOTE(JSON_EXTRACT(fibroscan_analysis,'$.cap_db_m')),'[^0-9.]',''),'') AS DECIMAL(10,2)) AS cap,
    CAST(NULLIF(REGEXP_REPLACE(JSON_UNQUOTE(JSON_EXTRACT(fibroscan_analysis,'$.liver_stiffness_kpa')),'[^0-9.]',''),'') AS DECIMAL(10,2)) AS lsm
  FROM mytatva.patient_registrations
  WHERE flow_type = 'Fibroscan upload'
    AND is_complete = 1
    AND patient_contact_number IS NOT NULL
    AND whatsapp_number NOT IN ('9059067327','7979078551')
),
valid AS (
  SELECT * FROM scans WHERE cap > 0 AND lsm > 0
),
counted AS (
  SELECT v.*, COUNT(*) OVER (PARTITION BY pm) AS sc FROM valid v
)
SELECT JSON_OBJECT(
  'pm',         pm,
  'name',       COALESCE(name,''),
  'doctor_id',  COALESCE(doctor_id,''),
  'machine_id', COALESCE(machine_id,''),
  'date',       DATE_FORMAT(scan_date,'%Y-%m-%d'),
  'cap',        cap,
  'lsm',        lsm
)
FROM counted
WHERE sc >= 2
ORDER BY pm, created_at;
