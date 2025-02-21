import arcpy
import requests
from lxml import etree
import datetime
import json

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    wfs_url = arcpy.GetParameterAsText(0)
    layers = None
    generalOutputInfo = {'error': False, 'infoMessages': []}
    r = None
    layers = []
    
    try:
        params = {
            'service': 'WFS', 
            'request': 'GetCapabilities', 
        }
        r = requests.get(wfs_url, params=params)
        if not r.ok:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Connection to WFS failed.'})
    except:
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'Failed to send WFS GetCapabilities request.'})
    
    if not generalOutputInfo['error']:
        try:
            root = etree.fromstring(r.content)
            namespaces = root.nsmap
            featureTypes = root.findall('.//wfs:FeatureType', namespaces=namespaces)
            for ft in featureTypes:
                layer_name = ft.find('wfs:Name', namespaces=namespaces).text
                if layer_name != None:
                    layers.append(layer_name)
            layers.sort()
            generalOutputInfo['infoMessages'].append({'message': 'WFS feature types fetched.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to get WFS feature types.'})
    

    if not generalOutputInfo['error']:
        arcpy.SetParameter(1, json.dumps(layers, ensure_ascii = False))
    arcpy.SetParameter(2, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))