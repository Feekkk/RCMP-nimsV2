import { getDbPool } from '@backend/server/core/db';

let tableReady: Promise<void> | null = null;

async function ensureDisposalDownloadTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const pool = getDbPool();
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS disposal_form_download (
          download_id INT AUTO_INCREMENT PRIMARY KEY,
          no_rujukan_pelupusan VARCHAR(64) NOT NULL,
          form_name VARCHAR(32) NOT NULL,
          staff_id INT NOT NULL,
          downloaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          KEY idx_disposal_form_download_rujukan (no_rujukan_pelupusan)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      );
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

export async function logDisposalFormDownload(input: {
  noRujukanPelupusan: string;
  form: string;
  staffId: string;
}): Promise<void> {
  const staffId = Number(input.staffId);
  if (!Number.isInteger(staffId) || staffId < 1) {
    throw new Error('Your session could not be verified.');
  }
  await ensureDisposalDownloadTable();
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO disposal_form_download (no_rujukan_pelupusan, form_name, staff_id)
     VALUES (?, ?, ?)`,
    [input.noRujukanPelupusan.slice(0, 64), input.form.slice(0, 32), staffId],
  );
}
