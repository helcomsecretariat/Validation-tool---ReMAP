import arcpy
import os
import datetime
import json
import requests
#from owslib.wfs import WebFeatureService

def last(string, delimiter):
    """Return the last element from string, after the delimiter

    If string ends in the delimiter or the delimiter is absent,
    returns the original string without the delimiter.

    """
    prefix, delim, last = string.rpartition(delimiter)
    return last if (delim and last) else prefix
    
if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    wfs_url = arcpy.GetParameterAsText(0)
    wfs_feature_type = arcpy.GetParameterAsText(1)
    geometry = arcpy.GetParameterAsText(2)
    output_fc = None
    output_fields = {}
    generalOutputInfo = {'error': False, 'infoMessages': []}
    # Path to the file geodatabase where intermediate temporary datasets are stored
    work_gdb = r'work.gdb'
    
    # Check WFS connction
    try:
        params = {
            'service': 'WFS', 
            'request': 'GetCapabilities', 
        }
        r = requests.get(wfs_url, params=params)
        if not r.ok:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to connect to WFS.'})
    except:
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'Failed to send request to WFS.'})
        
    # # Check if feature type is in WFS
    # try:
        # wfs = WebFeatureService(url = wfs_url)
        # layers = list(wfs.contents)
        # if wfs_feature_type not in layers:
            # generalOutputInfo['error'] = True
            # generalOutputInfo['infoMessages'].append({'error': 'Feature type ' + wfs_feature_type + ' is not present in WFS.'})
    # except:
        # generalOutputInfo['error'] = True
        # generalOutputInfo['infoMessages'].append({'error': 'Failed to get WFS feature types.'})
    
    # Export WFS feature type to GDB feature class
    if not generalOutputInfo['error']:
        try:
            output_fc = os.path.join(work_gdb, 'fc_' + str(time))
            wfs_feature_type_name = last(wfs_feature_type, ':')
            arcpy.conversion.WFSToFeatureClass(wfs_url, wfs_feature_type_name, work_gdb, 'fc_' + str(time), max_features=5000)
            #output_fc = arcpy.conversion.FeatureClassToFeatureClass(output_wfs_dataset_path, arcpy.env.scratchGDB, 'fc_' + str(time))
            generalOutputInfo['infoMessages'].append({'message': 'WFS feature type exported for validation.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to export WFS feature type ' + wfs_feature_type + ' for validation.'})
    
    if not generalOutputInfo['error']:
        generalOutputInfo['infoMessages'].append({'message': wfs_feature_type + ' WFS feature type is extracted.'})
        
        # Reading dataset capabilities
        desc = None
        try:
            if arcpy.Exists(output_fc):
                desc = arcpy.Describe(output_fc)
                generalOutputInfo['infoMessages'].append({'message': 'Capabilities of dataset fetched.'})
            else:
                generalOutputInfo['error'] = True
                generalOutputInfo['infoMessages'].append({'error': 'Failed to save WFS feature type for validation.'})
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to read dataset capabilities.'})
                        
    # Check dataset geometry
    if not generalOutputInfo['error']:
        if desc.shapeType.lower() == geometry:
            generalOutputInfo['infoMessages'].append({'message': 'Dataset geometry is ' + geometry + '.'})
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Dataset geometry is not ' + geometry + '.'})
            
    # Get dataset fields
    if not generalOutputInfo['error']:
        fields = None
        try:
            fields = arcpy.ListFields(output_fc)
        except:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to fetch dataset attributes.'})
    
    
    if not generalOutputInfo['error']:
        if fields is not None:
            generalOutputInfo['infoMessages'].append({'message': 'Attributes fetched.'})
            excludeFields = ['GmlID', 'OBJECTID', 'Shape', 'Shape_Length', 'Shape_Area']
            for field in fields:
                if field.name not in excludeFields:
                    if field.type == 'String' and field.length > 0:
                        output_fields[field.name] = 'text[' + str(field.length) + ']'
                    if field.type == 'Integer' or field.type == 'SmallInteger':
                        output_fields[field.name] = 'integer'
                    if field.type == 'Double' or field.type == 'Single':
                        output_fields[field.name] = 'float'
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'Failed to get attributes of ' + dataset_names[0] + ' dataset.'})

    
    if output_fc is not None:
        arcpy.SetParameter(3, output_fc)
    arcpy.SetParameter(4, json.dumps(output_fields, ensure_ascii = False))
    arcpy.SetParameter(5, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))