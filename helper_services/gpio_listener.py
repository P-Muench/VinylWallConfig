# GPIO-Bibliothek laden
import json
import threading
from time import sleep, time
import os

import lgpio
from gpiozero.pins.lgpio import LGPIOPin, LGPIOHardwareSPI, LGPIOHardwareSPIShared
from gpiozero.pins.local import LocalPiFactory

from signal_handler import SignalHandler
# import RPi.GPIO as GPIO
from gpiozero import Button
import requests

# Fetching the GPIO pin configuration and endpoint from environment variables
PIN_STR = os.getenv("GPIO_CONFIGURATION")  # e.g., "4, 5, 6, 7, 8, 9, 11, 12"
PINS = [int(s.strip()) for s in PIN_STR.split(",")]
ENDPOINT = os.getenv("BUTTON_ENDPOINT")  # e.g., "http://192.168.2.107:80/handle_button/"

class LGPIOFactory(LocalPiFactory):
    """
    Extends :class:`~gpiozero.pins.local.LocalPiFactory`. Uses the `lgpio`_
    library to interface to the local computer's GPIO pins. The lgpio library
    simply talks to Linux gpiochip devices; it is not specific to the Raspberry
    Pi although this class is currently constructed under the assumption that
    it is running on a Raspberry Pi.

    You can construct lgpio pins manually like so::

        from gpiozero.pins.lgpio import LGPIOFactory
        from gpiozero import LED

        factory = LGPIOFactory(chip=0)
        led = LED(12, pin_factory=factory)

    The *chip* parameter to the factory constructor specifies which gpiochip
    device to attempt to open. It defaults to 0 and thus doesn't normally need
    to be specified (the example above only includes it for completeness).

    The lgpio library relies on access to the :file:`/dev/gpiochip*` devices.
    If you run into issues, please check that your user has read/write access
    to the specific gpiochip device you are attempting to open (0 by default).

    .. _lgpio: http://abyz.me.uk/lg/py_lgpio.html
    """
    def __init__(self, chip=0):
        super().__init__()
        if chip is None:
            chip = 4 if (self._get_revision() & 0xff0) >> 4 == 0x17 else 0
        self._handle = lgpio.gpiochip_open(chip)
        self._chip = chip
        self.pin_class = LGPIOPin

    def close(self):
        super().close()
        if self._handle is not None:
            lgpio.gpiochip_close(self._handle)
            self._handle = None

    @property
    def chip(self):
        return self._chip

    def _get_spi_class(self, shared, hardware):
        # support via lgpio instead of spidev
        if hardware:
            return [LGPIOHardwareSPI, LGPIOHardwareSPIShared][shared]
        return super()._get_spi_class(shared, hardware=False)

pf = LGPIOFactory(chip=0)

# Initialize Button objects for each GPIO pin
buttons = [Button(pin, pin_factory=pf) for pin in PINS]


def make_request(key):
    """Send a POST request with the key of the button pressed."""
    data = {'key': key}
    data_json = json.dumps(data)
    print(time(), "SENDING", key)
    try:
        r = requests.post(ENDPOINT,
                          data=data_json,
                          headers={'Content-Type': 'application/json'})
    except Exception as e:
        print(time(), "Exception while sending request", e)
    else:
        print(time(), "SENT", key, r.status_code)


def monitor_pins():
    """Monitor the GPIO pins for button presses."""
    signal_handler = SignalHandler()
    registered = False
    former_t = 0

    while signal_handler.can_run():
        t = 0
        for i, button in enumerate(buttons):
            if not button.value:
                t += 2 ** i
        print([b.pin for b in buttons if not b.value])
        if t > 0:
            if former_t == t and not registered:
                print(time(), "registered", t)
                thread = threading.Thread(target=make_request, args=(t,))
                thread.start()
                registered = True
        else:
            registered = False
            sleep(0.01)

        former_t = t


def main():
    try:
        print("Initialized Button Listeners")
        monitor_pins()
    except KeyboardInterrupt:
        print("Gracefully shutting down...")
    finally:
        print("Cleaning up resources.")


if __name__ == '__main__':
    main()
