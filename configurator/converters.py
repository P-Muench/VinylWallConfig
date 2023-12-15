class NegativeIntConverter:
    regex = r'-?\d+'

    @staticmethod
    def to_python(value):
        return int(value)

    @staticmethod
    def to_url(value):
        return '%d' % value
