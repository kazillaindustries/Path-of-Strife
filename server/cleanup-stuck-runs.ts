import { prisma } from "./src/lib/prisma";

async function cleanupStuckRuns() {
  try {
    // Find all unfinished runs
    const stuckRuns = await prisma.run.findMany({
      where: { finished: false },
    });

    console.log(`Found ${stuckRuns.length} stuck runs`);

    // Delete battles for each stuck run
    for (const run of stuckRuns) {
      const battlesDeleted = await prisma.battle.deleteMany({
        where: { runId: run.id },
      });
      console.log(`Deleted ${battlesDeleted.count} battles for run ${run.id}`);

      // Delete the run
      await prisma.run.delete({
        where: { id: run.id },
      });
      console.log(`Deleted stuck run ${run.id}`);
    }

    console.log("Cleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupStuckRuns();
