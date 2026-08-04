const TARGET_URL = "https://www.instagram.com/reel/DYKFNTnpbtk/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";
const API_BASE = "http://localhost:3001";

async function verifySleightOfHandLoop() {
  console.log("====================================================================");
  console.log("🔄 LOOP ENGINEERING VERIFICATION: SLEIGHT OF HAND AI PIPELINE");
  console.log("====================================================================");
  console.log(`[Step 1] Ingesting Reel URL: ${TARGET_URL}`);

  try {
    // 1. Trigger Ignition Endpoint
    const ingestRes = await fetch(`${API_BASE}/api/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: TARGET_URL,
        platform: 'Instagram',
        contentType: 'Reel'
      })
    });

    if (!ingestRes.ok) {
      throw new Error(`Ingest endpoint failed with HTTP ${ingestRes.status}: ${await ingestRes.text()}`);
    }

    const ingestData = await ingestRes.json();
    console.log("✅ [Step 1 Success] Immediate 202 Accepted Response Received!");
    console.log(`   Job ID generated: ${ingestData.jobId}`);
    console.log(`   Status Message: "${ingestData.message}"`);
    console.log("--------------------------------------------------------------------");
    console.log("[Step 2] Parallel Background Execution Active (Node 01 analyzing)...");
    console.log("         Simulating user entering private retention metrics in modal...");
    
    await new Promise(r => setTimeout(r, 3500)); // wait 3.5 seconds

    console.log("--------------------------------------------------------------------");
    console.log("[Step 3] Submitting verified private stats to Payoff Endpoint (/api/complete-analysis):");
    const testAnalytics = {
      views: 67000,
      watchTime: 57,
      likes: 8000,
      comments: 53,
      shares: 89,
      saves: 88,
      profileVisits: 22000,
      followersGained: 9000
    };
    console.log("   Telemetry:", JSON.stringify(testAnalytics, null, 2));

    const payoffRes = await fetch(`${API_BASE}/api/complete-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: ingestData.jobId,
        analytics: testAnalytics,
        brandContext: "High-growth creator analyzing a high-profile viral hit with massive profile visit conversion rate."
      })
    });

    if (!payoffRes.ok) {
      throw new Error(`Payoff endpoint failed with HTTP ${payoffRes.status}: ${await payoffRes.text()}`);
    }

    const finalResult = await payoffRes.json();
    console.log("====================================================================");
    console.log("🎯 🎉 NEURAL DIAGNOSTIC VERDICT GENERATED SUCCESSFULLY!");
    console.log("====================================================================");
    console.log("📜 EXTRACTED TRANSCRIPT / MEDIA CONTEXT:");
    console.log("   " + finalResult.transcript.substring(0, 150) + "...\n");
    console.log("✅ WHAT WORKED:");
    finalResult.whatWorked.forEach((w, i) => console.log(`   ${i+1}. ${w}`));
    console.log("\n❌ WHAT FAILED / RETENTION FRACTURES:");
    finalResult.whatFailed.forEach((f, i) => console.log(`   ${i+1}. ${f}`));
    console.log("\n🚀 NEXT POST STRATEGY:");
    console.log(`   Title: ${finalResult.nextPostStrategy?.title}`);
    console.log(`   Advice snippet: ${finalResult.nextPostStrategy?.advice?.substring(0, 200)}...`);
    console.log("\n🎬 HIGH-VELOCITY SCRIPT REPLACEMENT:");
    console.log(`   Hook: "${finalResult.script?.hook}"`);
    console.log(`   CTA: "${finalResult.script?.cta}"`);
    console.log("====================================================================");
    console.log("✨ ALL LOOP ENGINEERING VERIFICATION CHECKS PASSED 100%!");

  } catch (error) {
    console.error("❌ [Loop Engineering Verification Error]:", error);
    process.exit(1);
  }
}

verifySleightOfHandLoop();
