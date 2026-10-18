import copy
import datetime as dt
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('availability', pathlib.Path(__file__).parents[1] / 'scripts/check-availability.py')
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class AvailabilityTests(unittest.TestCase):
    def item(self, host='admira.studio', status=200, body='{}'):
        return {'probe': {'country': 'ES', 'city': 'Badalona', 'asn': 3352, 'network': 'Telefonica'},
                'result': {'status': 'finished', 'statusCode': status, 'rawBody': body,
                           'headers': {}, 'tls': {'authorized': True,
                             'subject': {'CN': host, 'alt': 'DNS:' + host},
                             'expiresAt': '2099-01-01T00:00:00Z'}}}

    def test_login_401_is_expected_but_200_error_page_is_not(self):
        item = self.item(status=401, body='Admira Studio Acceso con Google')
        self.assertEqual(monitor.evaluate(monitor.CHECKS[2], item)['outcome'], 'healthy')
        item['result']['statusCode'] = 200
        self.assertEqual(monitor.evaluate(monitor.CHECKS[2], item)['outcome'], 'down')

    def test_redirect_to_external_login_is_rejected(self):
        item = self.item(status=302)
        item['result']['headers']['location'] = '/auth/login?return_to=%2F'
        self.assertEqual(monitor.evaluate(monitor.CHECKS[1], item)['outcome'], 'healthy')
        item['result']['headers']['location'] = 'https://other.example/auth/login'
        self.assertEqual(monitor.evaluate(monitor.CHECKS[1], item)['outcome'], 'down')

    def test_invalid_certificate_and_wrong_hostname_fail(self):
        item = self.item(body='{"git":"' + 'a' * 40 + '"}')
        self.assertEqual(monitor.evaluate(monitor.CHECKS[0], item)['outcome'], 'healthy')
        item['result']['tls']['authorized'] = False
        self.assertEqual(monitor.evaluate(monitor.CHECKS[0], item)['outcome'], 'down')
        item['result']['tls']['authorized'] = True
        item['result']['tls']['subject']['alt'] = 'DNS:unrelated.example'
        self.assertEqual(monitor.evaluate(monitor.CHECKS[0], item)['outcome'], 'down')

    def test_expiry_warning_precedes_expiry_failure(self):
        item = self.item(status=401, body='Admira Studio Acceso con Google')
        instant = dt.datetime(2098, 12, 25, tzinfo=dt.timezone.utc)
        self.assertTrue(monitor.evaluate(monitor.CHECKS[2], item, instant)['warnings'])
        instant = dt.datetime(2099, 1, 2, tzinfo=dt.timezone.utc)
        self.assertEqual(monitor.evaluate(monitor.CHECKS[2], item, instant)['outcome'], 'down')

    def test_dns_private_answer_is_not_healthy(self):
        item = self.item()
        item['result'].update(statusCode=0, answers=[{'type': 'A', 'value': '192.168.1.1'}])
        self.assertEqual(monitor.evaluate(monitor.CHECKS[4], item)['outcome'], 'down')
        item['result']['answers'][0]['value'] = '172.66.45.26'
        self.assertEqual(monitor.evaluate(monitor.CHECKS[4], item)['outcome'], 'healthy')

    def test_probe_failure_is_not_reported_as_website_down(self):
        item = self.item()
        item['result'] = {'status': 'failed', 'failureSource': 'internal'}
        self.assertEqual(monitor.evaluate(monitor.CHECKS[0], item)['outcome'], 'unknown')
        item['result']['failureSource'] = 'target'
        self.assertEqual(monitor.evaluate(monitor.CHECKS[0], item)['outcome'], 'down')

    def test_two_failed_observations_open_one_incident(self):
        row = monitor.evaluate(monitor.CHECKS[2], self.item(status=503))
        attempt = {'checks': [row], 'errors': []}
        report = monitor.finalize(attempt, copy.deepcopy(attempt))
        self.assertEqual((report['availability'], report['event']), ('down', 'incident'))
        repeated = monitor.finalize(attempt, copy.deepcopy(attempt), report)
        self.assertEqual(repeated['event'], 'unchanged')

    def test_transient_failure_does_not_open_incident(self):
        bad = {'checks': [monitor.evaluate(monitor.CHECKS[2], self.item(status=503))], 'errors': []}
        good = {'checks': [monitor.evaluate(monitor.CHECKS[2], self.item(status=401, body='Admira Studio Acceso con Google'))], 'errors': []}
        self.assertEqual(monitor.finalize(bad, good)['availability'], 'healthy')

    def test_missing_spain_is_monitor_degraded_not_healthy(self):
        attempt = {'checks': [], 'errors': ['Incomplete ES coverage']}
        report = monitor.finalize(attempt, previous={'last_known_availability': 'down'})
        self.assertEqual(report['availability'], 'unknown')
        self.assertEqual(report['last_known_availability'], 'down')
        self.assertEqual(report['event'], 'monitor-degraded')

    def test_recovery_after_unknown_preserves_incident(self):
        good = {'checks': [monitor.evaluate(monitor.CHECKS[2], self.item(status=401, body='Admira Studio Acceso con Google'))], 'errors': []}
        previous = {'availability': 'unknown', 'last_known_availability': 'down'}
        self.assertEqual(monitor.finalize(good, previous=previous)['event'], 'recovered')


if __name__ == '__main__':
    unittest.main()
