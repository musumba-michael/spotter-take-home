from django import forms


class FuelStationUploadForm(forms.Form):
    csv_file = forms.FileField()
