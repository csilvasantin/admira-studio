import copy
import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('reader', Path(__file__).parents[1] / 'scripts/read-availability.py')
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
INSTANT = dt.datetime(2026, 10, 18, 21, tzinfo=dt.timezone.utc)


class ReaderTests(unittest.TestCase):
    def doc(self, status='healthy', sequence=1):
        return {'latest': {'schema': 2, 'scheduler': 'cloudflare-cron', 'availability': status,
            'sequence': sequence, 'checked_at': INSTANT.isoformat(), 'run_url': reader.SOURCE,
            'warnings': [], 'confirmed_failures': [], 'attempts': [{'checks': [], 'errors': []}]}, 'history': []}

    def test_baseline_and_repeats_are_quiet(self):
        output, state = reader.notification(self.doc(), {}, INSTANT)
        self.assertFalse(output['notify'])
        self.assertFalse(reader.notification(self.doc(sequence=2), state, INSTANT)[0]['notify'])

    def test_incident_and_recovery_are_once(self):
        _, state = reader.notification(self.doc(), {}, INSTANT)
        out, state = reader.notification(self.doc('down', 2), state, INSTANT)
        self.assertTrue(out['notify'])
        out, state = reader.notification(self.doc('down', 3), state, INSTANT)
        self.assertFalse(out['notify'])
        out, state = reader.notification(self.doc('healthy', 4), state, INSTANT)
        self.assertTrue(out['notify'])
        self.assertFalse(reader.notification(self.doc('healthy', 5), state, INSTANT)[0]['notify'])

    def test_pending_is_quiet_and_does_not_hide_recovery(self):
        _, state = reader.notification(self.doc(), {}, INSTANT)
        out, state = reader.notification(self.doc('suspect', 2), state, INSTANT)
        self.assertFalse(out['notify'])
        out, state = reader.notification(self.doc('down', 3), state, INSTANT)
        self.assertTrue(out['notify'])
        out, state = reader.notification(self.doc('suspect', 4), state, INSTANT)
        self.assertFalse(out['notify'])
        out, _ = reader.notification(self.doc('healthy', 5), state, INSTANT)
        self.assertTrue(out['notify'])

    def test_stale_and_read_failures_are_deduplicated(self):
        out, state = reader.notification(self.doc(), {}, INSTANT + dt.timedelta(minutes=21))
        self.assertEqual(out['availability'], 'stale')
        self.assertTrue(out['notify'])
        self.assertFalse(reader.notification(self.doc(), state, INSTANT + dt.timedelta(minutes=22))[0]['notify'])
        out, state = reader.failed_read(state, RuntimeError())
        self.assertEqual(out['availability'], 'unknown')
        self.assertTrue(out['notify'])
        self.assertFalse(reader.failed_read(state, RuntimeError())[0]['notify'])

    def test_missed_incident_surfaces_after_offline_period(self):
        _, state = reader.notification(self.doc(), {}, INSTANT)
        current = self.doc(sequence=4)
        current['history'] = [{'sequence': 2, 'event': 'incident', 'checked_at': INSTANT.isoformat()}]
        out, state = reader.notification(current, state, INSTANT)
        self.assertTrue(out['notify'])
        self.assertEqual(len(out['missed_incidents']), 1)
        self.assertFalse(reader.notification(current, state, INSTANT)[0]['notify'])

    def test_source_migration_does_not_compare_unrelated_run_ids(self):
        doc = self.doc(sequence=5)
        doc['history'] = [{'sequence': 2, 'event': 'incident'}]
        previous = {'source': 'old-provider', 'run_id': 123456789, 'availability': 'stale'}
        out, _ = reader.notification(doc, previous, INSTANT)
        self.assertTrue(out['notify'])
        self.assertEqual(out['missed_incidents'], [])

    def test_certificate_warning_notifies_once(self):
        doc = self.doc()
        doc['latest']['warnings'] = ['TLS certificate expires within 14 days']
        out, state = reader.notification(doc, {}, INSTANT)
        self.assertTrue(out['notify'])
        self.assertFalse(reader.notification(doc, state, INSTANT)[0]['notify'])


if __name__ == '__main__':
    unittest.main()
