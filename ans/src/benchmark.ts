import { PolicyEngine } from './policy';

console.log("=================================================");
console.log("   ANS Policy Evaluation Micro-Benchmark Test    ");
console.log("=================================================");

// -------------------------------------------------------------
// الجانب الأول: اختبار التوسع (Scalability Test)
// -------------------------------------------------------------
const agentScenarios = [50, 100, 200, 500];

agentScenarios.forEach((count) => {
    const mockContext = {
        agentName: "test-agent",
        provider: "mlops-team",
        version: "v2.1",
        namespace: "staging",
        capability: "database-read",
        "security.ans.io/clearance-level": "3"
    };

    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
        PolicyEngine.evaluatePolicy("agent-deployment-policy", mockContext);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`[✔] number of agents ${count.toString().padEnd(3)} | total processing time: ${totalTime.toFixed(2)} ms`);
});

// -------------------------------------------------------------
// الجانب الثاني: اختبار حالات الفشل والاختراق (Security Failure Cases)
// -------------------------------------------------------------
console.log("\n=================================================");
console.log("   ANS Security Evasion & Failure Case Testing   ");
console.log("=================================================");

// 1. محاولة اختراق بيئة الإنتاج من مزود غير موثوق
const maliciousProviderContext = {
    agentName: "compromised-agent",
    provider: "opensource-hub", 
    version: "v2.1",
    namespace: "production" 
};

// 2. محاولة استخدام إصدار قديم يحتوي على ثغرات
const legacyVersionContext = {
    agentName: "legacy-agent",
    provider: "mlops-team",
    version: "v1.0.4-alpha", 
    namespace: "staging"
};

// 3. طلب صلاحية حساسة بمستوى سرية منخفض
const privilegeEscalationContext = {
    agentName: "unauthorized-writer",
    provider: "research-lab",
    version: "v2.0",
    capability: "database-write", 
    namespace: "staging",
    "security.ans.io/clearance-level": "2" 
};

// تشغيل فحص الهجوم الأول
const startAttack1 = performance.now();
PolicyEngine.evaluatePolicy("agent-deployment-policy", maliciousProviderContext);
const endAttack1 = performance.now();
console.log(`[✖] attack 1 (breach of environment isolation): successfully blocked | detection time: ${(endAttack1 - startAttack1).toFixed(4)} ms`);

// تشغيل فحص الهجوم الثاني
const startAttack2 = performance.now();
PolicyEngine.evaluatePolicy("agent-deployment-policy", legacyVersionContext);
const endAttack2 = performance.now();
console.log(`[✖] attack 2 (version governance breach): successfully blocked | detection time: ${(endAttack2 - startAttack2).toFixed(4)} ms`);

// تشغيل فحص الهجوم الثالث
const startAttack3 = performance.now();
PolicyEngine.evaluatePolicy("agent-deployment-policy", privilegeEscalationContext);
const endAttack3 = performance.now();
console.log(`[✖] attack 3 (unauthorized privilege escalation): successfully blocked | detection time: ${(endAttack3 - startAttack3).toFixed(4)} ms`);

console.log("=================================================");