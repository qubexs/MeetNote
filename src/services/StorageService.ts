import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export interface Meeting {
  id?: number;
  title: string;
  audioPath: string;
  transcript: string;
  summary: string;
  keyPoints: string;
  actionItems: string;
  duration: number;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

class StorageService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'meetnote.db',
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createMeetingsTable = `
      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        audioPath TEXT NOT NULL,
        transcript TEXT,
        summary TEXT,
        keyPoints TEXT,
        actionItems TEXT,
        duration INTEGER DEFAULT 0,
        recordedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `;

    await this.db.executeSql(createMeetingsTable);
  }

  async saveMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO meetings (
        title, audioPath, transcript, summary, keyPoints, actionItems, 
        duration, recordedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      meeting.title,
      meeting.audioPath,
      meeting.transcript || '',
      meeting.summary || '',
      meeting.keyPoints || '',
      meeting.actionItems || '',
      meeting.duration,
      meeting.recordedAt,
      now,
      now,
    ];

    const [result] = await this.db.executeSql(query, values);
    return result.insertId;
  }

  async updateMeeting(id: number, updates: Partial<Meeting>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    const query = `UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.executeSql(query, values);
  }

  async getMeeting(id: number): Promise<Meeting | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM meetings WHERE id = ?';
    const [result] = await this.db.executeSql(query, [id]);

    if (result.rows.length > 0) {
      return result.rows.item(0) as Meeting;
    }

    return null;
  }

  async getAllMeetings(limit: number = 100, offset: number = 0): Promise<Meeting[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'SELECT * FROM meetings ORDER BY recordedAt DESC LIMIT ? OFFSET ?';
    const [result] = await this.db.executeSql(query, [limit, offset]);

    const meetings: Meeting[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      meetings.push(result.rows.item(i) as Meeting);
    }

    return meetings;
  }

  async searchMeetings(searchTerm: string): Promise<Meeting[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT * FROM meetings 
      WHERE title LIKE ? OR transcript LIKE ? OR summary LIKE ?
      ORDER BY recordedAt DESC
    `;
    const searchPattern = `%${searchTerm}%`;
    const [result] = await this.db.executeSql(query, [searchPattern, searchPattern, searchPattern]);

    const meetings: Meeting[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      meetings.push(result.rows.item(i) as Meeting);
    }

    return meetings;
  }

  async deleteMeeting(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const query = 'DELETE FROM meetings WHERE id = ?';
    await this.db.executeSql(query, [id]);
  }

  async getMeetingsByDateRange(startDate: string, endDate: string): Promise<Meeting[]> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT * FROM meetings 
      WHERE recordedAt BETWEEN ? AND ?
      ORDER BY recordedAt DESC
    `;
    const [result] = await this.db.executeSql(query, [startDate, endDate]);

    const meetings: Meeting[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      meetings.push(result.rows.item(i) as Meeting);
    }

    return meetings;
  }

  async getStatistics(): Promise<{
    totalMeetings: number;
    totalDuration: number;
    averageDuration: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT 
        COUNT(*) as totalMeetings,
        SUM(duration) as totalDuration,
        AVG(duration) as averageDuration
      FROM meetings
    `;
    const [result] = await this.db.executeSql(query);

    return result.rows.item(0);
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM meetings');
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export default new StorageService();
