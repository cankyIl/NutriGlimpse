package expo.modules.privateinput;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;

/** Synthetic bytes only. Runs on a JVM; does not simulate Android OCR or device storage. */
public final class PrivateReportJournalCheck {
  public static void main(String[] args) throws Exception {
    File directory = new File(args[0]);
    Files.createDirectories(directory.toPath());
    File journal = new File(directory, "picker-baseline.json");
    File pending = new File(directory, "picker-baseline.json.pending");
    byte[] bytes = "{\"version\":1,\"baseline\":{}}".getBytes(StandardCharsets.UTF_8);
    if (args.length > 1 && args[1].equals("interrupt")) {
      PrivateReportJournal.write(journal, bytes, () -> Runtime.getRuntime().halt(23));
      throw new AssertionError("Interruption hook did not run");
    }
    Process process = new ProcessBuilder(System.getProperty("java.home") + "/bin/java",
      "-cp", System.getProperty("java.class.path"), PrivateReportJournalCheck.class.getName(),
      directory.getPath(), "interrupt").inheritIO().start();
    if (process.waitFor() != 23) throw new AssertionError("Unexpected interruption exit");
    if (journal.exists() || !pending.exists()) throw new AssertionError("Partial journal became visible");
    if (!Arrays.equals(bytes, Files.readAllBytes(pending.toPath()))) throw new AssertionError("Pending bytes were not synced");
    // Startup cleanup sees no committed journal and removes this abandoned owned session.
    Files.delete(pending.toPath());
    PrivateReportJournal.write(journal, bytes);
    if (pending.exists() || !Arrays.equals(bytes, Files.readAllBytes(journal.toPath()))) throw new AssertionError("Commit did not preserve exact bytes");
    try { PrivateReportJournal.write(journal, new byte[] { 1 }); throw new AssertionError("Existing journal overwritten"); }
    catch (java.io.IOException expected) { /* Existing baseline must survive. */ }
    if (!Arrays.equals(bytes, Files.readAllBytes(journal.toPath()))) throw new AssertionError("Existing journal changed");
    Files.delete(journal.toPath());
    Files.delete(directory.toPath());
    System.out.println("PASS: interrupted pre-commit journal, atomic commit, existing baseline preservation");
  }
}
