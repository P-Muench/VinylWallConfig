from django.test import TestCase
from configurator.models import Device


class TestDevice(TestCase):

    def test_activate_initially_inactive(self):
        device = Device(device_id="1", device_name="TestDevice", device_type="TestType")
        device.activate()
        self.assertTrue(device.active, "Device should be active after calling 'activate'")

    def test_activate_already_active(self):
        device = Device(device_id="1", device_name="TestDevice", device_type="TestType")
        device.active = True
        device.activate()
        self.assertTrue(device.active,
                        "Device should remain active when 'activate' is called on an already active device")


    def test_deactivate(self):
        device = Device(device_id="1", device_name="TestDevice", device_type="TestType")
        device.activate()
        self.assertTrue(device.active)

        device.deactivate()
        self.assertFalse(device.active)

