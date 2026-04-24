const { Pool } = require("pg");

let poolInstance;

const getPool = () => {
    if (!poolInstance) {
        poolInstance = new Pool({
            connectionString: process.env.DB_URL,
        });
        
        poolInstance.on("error", (error) => {
            console.error("Unexpected PostgreSQL pool error:", error);
        });
    }

    return poolInstance;
};

const pool = getPool();

const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    withTransaction,
};