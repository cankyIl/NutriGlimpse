package expo.modules.privateinput;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/** Atomic pre-picker journal commit; contains cache filenames only, never report contents. */
final class PrivateReportJournal {
  private PrivateReportJournal() {}

  static void write(File journal, byte[] contents) throws IOException {
    write(journal, contents, () -> {});
  }

  // Package-private hook lets the JVM interruption fixture stop after fsync, before rename.
  static void write(File journal, byte[] contents, Runnable beforeCommit) throws IOException {
    File pending = new File(journal.getParentFile(), journal.getName() + ".pending");
    if (journal.exists() || pending.exists()) throw new IOException("PICKER_JOURNAL_EXISTS");
    try {
      try (FileOutputStream output = new FileOutputStream(pending)) {
        output.write(contents);
        output.getFD().sync();
      }
      beforeCommit.run();
      // Both files are in the same private directory. The final name is never partial.
      if (!pending.renameTo(journal)) throw new IOException("PICKER_JOURNAL_COMMIT_FAILED");
    } finally {
      if (pending.exists() && !pending.delete()) throw new IOException("PICKER_JOURNAL_CLEANUP_FAILED");
    }
  }
}
