import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "public", "data");
    
    // Check if directory exists
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json([]);
    }
    
    // Get all comparison JSON files
    const files = fs.readdirSync(dataDir);
    const comparisonFiles = files.filter(
      (f) => f.startsWith("comparison_") && f.endsWith(".json")
    );
    
    return NextResponse.json(comparisonFiles);
  } catch (error) {
    console.error("Error listing comparison files:", error);
    return NextResponse.json([]);
  }
}
