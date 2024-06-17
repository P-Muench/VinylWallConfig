# GPIO-Bibliothek laden
import json
import threading
from time import sleep, time

from signal_handler import SignalHandler
import RPi.GPIO as GPIO
import requests



PINS = [4, 5, 6, 7, 8, 9, 11, 12]
ENDPOINT = "http://localhost:80/handle_button/"


def make_request(key):
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


def init():
    GPIO.setmode(GPIO.BCM)
    for i in PINS:
        GPIO.setup(i, GPIO.IN)
    print("Initialized")


def do_loop():
    signal_handler = SignalHandler()
    former_t = 0
    registered = False
    while signal_handler.can_run():
        t = 0
        for i in PINS:
            t += GPIO.input(i) * 2 ** (i - 4)
        if t > 0:
            if former_t == t and t > 0 and not registered:
                print(time(), "registered", t)
                thread = threading.Thread(target=make_request, args=(t,))
                thread.start()
                registered = True
        else:
            registered = False
            sleep(0.01)
        former_t = t


def cleanup():
    GPIO.cleanup()


def main():
    init()
    do_loop()
    cleanup()


if __name__ == '__main__':
    main()
