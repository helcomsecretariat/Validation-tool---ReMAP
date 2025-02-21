import arcpy
import zipfile
import os
import datetime
import json

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    dataset_path = arcpy.GetParameterAsText(0)
    attribute = arcpy.GetParameterAsText(1)
    output_values = []
    generalOutputInfo = {'error': False, 'infoMessages': []}
    
    values = None
    try:
        with arcpy.da.SearchCursor(dataset_path, [attribute]) as cursor:
            values = sorted({row[0] for row in cursor})
    except:
        generalOutputInfo['error'] = True
        generalOutputInfo['infoMessages'].append({'error': 'Failed to get unique values of the dataset.'})
    
    if not generalOutputInfo['error']:
        if values is not None:
            for value in values:
                output_values.append(value.strip())
        else:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'The dataset does not contain any values for ' + attribute + ' attribute.'})
            
        if len(output_values) == 0:
            generalOutputInfo['error'] = True
            generalOutputInfo['infoMessages'].append({'error': 'The dataset does not contain any values for ' + attribute + ' attribute.'})
        else:
            generalOutputInfo['infoMessages'].append({'message': 'Uniques values fetched.'})
    

    arcpy.SetParameter(2, json.dumps(output_values, ensure_ascii = False))
    arcpy.SetParameter(3, json.dumps(generalOutputInfo, ensure_ascii = False))

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))