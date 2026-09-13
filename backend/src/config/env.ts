import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  cookieSecure: (process.env.COOKIE_SECURE || 'true') === 'true',

  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'qwen/qwen3-32b',

  embeddingModel: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
  embeddingDim: parseInt(process.env.EMBEDDING_DIM || '384', 10),

  githubToken: process.env.GITHUB_TOKEN || '',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  chatRateLimitPerMin: parseInt(process.env.CHAT_RATE_LIMIT_PER_MIN || '10', 10),
  maxQuestionLength: parseInt(process.env.MAX_QUESTION_LENGTH || '500', 10),
  maxContextChunks: parseInt(process.env.MAX_CONTEXT_CHUNKS || '8', 10),
  maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY || '6', 10),

  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '15', 10),
};
