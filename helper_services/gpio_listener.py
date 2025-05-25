# GPIO-Bibliothek laden
import json
import threading
from time import sleep, time
import os

from signal_handler import SignalHandler
# import RPi.GPIO as GPIO
from gpiozero import Button

import requests

# Fetching the GPIO pin configuration and endpoint from environment variables
PIN_STR = os.getenv("GPIO_CONFIGURATION")  # e.g., "4, 5, 6, 7, 8, 9, 11, 12"
PINS = [int(s.strip()) for s in PIN_STR.split(",")]
ENDPOINT = os.getenv("BUTTON_ENDPOINT")  # e.g., "http://192.168.2.107:80/handle_button/"

# Initialize Button objects for each GPIO pin
buttons = [Button(pin) for pin in PINS]


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


if __name__ == '__main__':
    main()
