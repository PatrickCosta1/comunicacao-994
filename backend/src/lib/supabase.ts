import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("⚠️ SUPABASE_URL e SUPABASE_KEY devem estar definidos no .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
